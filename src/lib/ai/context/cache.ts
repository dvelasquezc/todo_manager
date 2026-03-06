'use server'

import type { AIContext, ContextTier, TaskSummary, CompletedTaskSummary, FocusSessionRecord, ActivityLogRecord } from '@/types/ai'

/**
 * Context cache management for AI assistant.
 * Caches context per user to avoid repeated DB queries.
 * Uses incremental updates when tasks/sessions change.
 */

interface CachedContext {
  data: AIContext
  loadedAt: Date
  tier: ContextTier
  userId: string
}

// In-memory cache (will reset on server restart, which is fine)
// In production, consider Redis for persistence across instances
const contextCache = new Map<string, CachedContext>()

// Cache expiry time in milliseconds (10 minutes)
const CACHE_EXPIRY_MS = 10 * 60 * 1000

/**
 * Get cache key for a user
 */
function getCacheKey(userId: string): string {
  return `context:${userId}`
}

/**
 * Get cached context if available and not stale
 */
export async function getCachedContext(
  userId: string,
  requiredTier: ContextTier
): Promise<AIContext | null> {
  const key = getCacheKey(userId)
  const cached = contextCache.get(key)

  if (!cached) {
    return null
  }

  const now = new Date()
  const age = now.getTime() - cached.loadedAt.getTime()

  // Check if stale
  if (age > CACHE_EXPIRY_MS) {
    contextCache.delete(key)
    return null
  }

  // Check if tier is sufficient
  const tierOrder: ContextTier[] = ['light', 'standard', 'full', 'max']
  const cachedTierIndex = tierOrder.indexOf(cached.tier)
  const requiredTierIndex = tierOrder.indexOf(requiredTier)

  // Cached tier must be >= required tier
  if (cachedTierIndex < requiredTierIndex) {
    return null // Need higher tier, fetch fresh
  }

  return cached.data
}

/**
 * Store context in cache
 */
export async function setCachedContext(
  userId: string,
  context: AIContext
): Promise<void> {
  const key = getCacheKey(userId)
  contextCache.set(key, {
    data: context,
    loadedAt: new Date(),
    tier: context.tier,
    userId,
  })
}

/**
 * Invalidate cache for a user (used on major changes)
 */
export async function invalidateCache(userId: string): Promise<void> {
  const key = getCacheKey(userId)
  contextCache.delete(key)
}

/**
 * Append a new task to the cache
 */
export async function appendTaskToCache(
  userId: string,
  task: TaskSummary
): Promise<void> {
  const key = getCacheKey(userId)
  const cached = contextCache.get(key)
  if (!cached) return

  // Add to current_tasks
  cached.data.current_tasks.push(task)
  cached.data.data_summary.active_task_count++
}

/**
 * Update a task in the cache
 */
export async function updateTaskInCache(
  userId: string,
  taskId: string,
  updates: Partial<TaskSummary>
): Promise<void> {
  const key = getCacheKey(userId)
  const cached = contextCache.get(key)
  if (!cached) return

  const index = cached.data.current_tasks.findIndex(t => t.id === taskId)
  if (index >= 0) {
    cached.data.current_tasks[index] = {
      ...cached.data.current_tasks[index],
      ...updates,
    }
  }
}

/**
 * Move a task from active to completed in cache
 */
export async function completeTaskInCache(
  userId: string,
  taskId: string,
  completedTask: CompletedTaskSummary
): Promise<void> {
  const key = getCacheKey(userId)
  const cached = contextCache.get(key)
  if (!cached) return

  // Remove from current_tasks
  const index = cached.data.current_tasks.findIndex(t => t.id === taskId)
  if (index >= 0) {
    cached.data.current_tasks.splice(index, 1)
    cached.data.data_summary.active_task_count--
  }

  // Add to recently_completed_tasks
  cached.data.recently_completed_tasks.unshift(completedTask)
  cached.data.data_summary.completed_task_count++
}

/**
 * Append a focus session to the cache
 */
export async function appendFocusSessionToCache(
  userId: string,
  session: FocusSessionRecord
): Promise<void> {
  const key = getCacheKey(userId)
  const cached = contextCache.get(key)
  if (!cached?.data.raw_data) return // Only if full context is cached

  cached.data.raw_data.focus_sessions.push(session)
  cached.data.data_summary.focus_session_count++
}

/**
 * Append an activity log to the cache
 */
export async function appendActivityLogToCache(
  userId: string,
  log: ActivityLogRecord
): Promise<void> {
  const key = getCacheKey(userId)
  const cached = contextCache.get(key)
  if (!cached?.data.raw_data) return // Only if full context is cached

  cached.data.raw_data.activity_logs.unshift(log) // Most recent first
  cached.data.data_summary.activity_log_count++
}

/**
 * Get cache info for display to user
 */
export async function getCacheInfo(userId: string): Promise<{
  tier: ContextTier
  loadedAt: Date
  ageMinutes: number
  isStale: boolean
} | null> {
  const key = getCacheKey(userId)
  const cached = contextCache.get(key)
  if (!cached) return null

  const now = new Date()
  const ageMs = now.getTime() - cached.loadedAt.getTime()
  const ageMinutes = Math.floor(ageMs / 60000)

  return {
    tier: cached.tier,
    loadedAt: cached.loadedAt,
    ageMinutes,
    isStale: ageMs > CACHE_EXPIRY_MS,
  }
}
