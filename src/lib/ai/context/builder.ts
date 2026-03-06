'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AIContext,
  ContextTier,
  TaskSummary,
  FrictionAlertSummary,
  AnalyticsSnapshot,
  ProjectSummary,
  ActivitySummary,
  MessageSummary,
  CompletedTaskSummary,
  ActivityLogRecord,
  FocusSessionRecord,
  DataSummary
} from '@/types/ai'
import type { Task, Project } from '@/types/database'

/**
 * Build the context for the AI assistant.
 * Supports three tiers:
 * - light: Basic summaries only (minimal tokens)
 * - standard: Full task data (default)
 * - full: Complete data including activity logs and focus sessions
 */
export async function buildContext(
  conversationId?: string,
  tier: ContextTier = 'standard'
): Promise<AIContext> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const now = new Date()
  const loadedAt = now.toISOString()

  // Always fetch basic data (for all tiers)
  // Fetch projects first since frictionAlerts depends on them
  const [profile, projects] = await Promise.all([
    getProfile(supabase, user.id),
    getProjects(supabase, user.id),
  ])

  // Now fetch friction alerts and weekly stats (passing projects to avoid duplicate query)
  const [frictionAlerts, weeklyStats] = await Promise.all([
    getFrictionAlerts(supabase, user.id, projects),
    getWeeklyStats(supabase, user.id),
  ])

  // Get task counts for light tier
  const { count: activeTaskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('status', 'done')

  // Build project summaries (used in all tiers)
  const projectSummaries: ProjectSummary[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    task_count: 0, // Will be updated if we fetch tasks
  }))

  // Build analytics snapshot (used in all tiers)
  const analytics: AnalyticsSnapshot = {
    weekly_hours: weeklyStats.totalHours,
    tasks_completed_this_week: weeklyStats.tasksCompleted,
    avg_cycle_time_days: weeklyStats.avgCycleTimeDays,
    deep_work_percent: weeklyStats.deepWorkPercent || 0,
    estimate_accuracy: weeklyStats.estimateAccuracy,
  }

  // Light tier: minimal data
  if (tier === 'light') {
    const recentActivity = await getRecentActivity(supabase, user.id)

    const dataSummary: DataSummary = {
      active_task_count: activeTaskCount || 0,
      completed_task_count: 0,
      activity_log_count: 0,
      focus_session_count: 0,
    }

    return {
      tier: 'light',
      tier_description: `Light: ${dataSummary.active_task_count} tasks (summaries only)`,
      data_summary: dataSummary,
      loaded_at: loadedAt,
      user_summary: {
        timezone: profile.timezone || 'America/Los_Angeles',
        total_tasks: activeTaskCount || 0,
        wip_count: 0,
        projects: projectSummaries,
      },
      user_instructions: profile.ai_instructions,
      current_tasks: [],
      recently_completed_tasks: [],
      friction_alerts: frictionAlerts,
      recent_activity: recentActivity,
      analytics_snapshot: analytics,
      conversation_history: conversationId ? await getConversationHistory(supabase, conversationId) : [],
    }
  }

  // Standard and Full tiers: fetch task data
  const [tasks, recentlyCompletedTasks, recentActivity, conversationHistory] = await Promise.all([
    getActiveTasks(supabase, user.id),
    getRecentlyCompletedTasks(supabase, user.id),
    getRecentActivity(supabase, user.id),
    conversationId ? getConversationHistory(supabase, conversationId) : Promise.resolve([]),
  ])

  // Build task summaries with age calculation
  const taskSummaries: TaskSummary[] = tasks.map(task => {
    const project = projects.find(p => p.id === task.project_id)
    const createdAt = new Date(task.created_at)
    const updatedAt = new Date(task.updated_at)

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      project_id: task.project_id,
      project_name: project?.name || 'Unknown',
      due_date: task.due_date,
      start_date: task.start_date,
      estimate_hours: task.estimate_hours,
      actual_hours: task.actual_hours,
      energy_level: task.energy_level,
      age_days: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      days_in_status: Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    }
  })

  // Update project summaries with task counts (O(n) using Map)
  const taskCountByProject = new Map<string, number>()
  for (const t of tasks) {
    if (t.project_id) {
      taskCountByProject.set(t.project_id, (taskCountByProject.get(t.project_id) || 0) + 1)
    }
  }
  for (const p of projectSummaries) {
    p.task_count = taskCountByProject.get(p.id) || 0
  }

  // Calculate WIP count
  const wipCount = tasks.filter(t =>
    ['today', 'next', 'waiting', 'blocked'].includes(t.status)
  ).length

  // Standard tier: task data but no raw logs
  if (tier === 'standard') {
    const dataSummary: DataSummary = {
      active_task_count: taskSummaries.length,
      completed_task_count: recentlyCompletedTasks.length,
      activity_log_count: 0,
      focus_session_count: 0,
    }

    return {
      tier: 'standard',
      tier_description: `Standard: ${dataSummary.active_task_count} active tasks, ${dataSummary.completed_task_count} completed`,
      data_summary: dataSummary,
      loaded_at: loadedAt,
      user_summary: {
        timezone: profile.timezone || 'America/Los_Angeles',
        total_tasks: tasks.length,
        wip_count: wipCount,
        projects: projectSummaries,
      },
      user_instructions: profile.ai_instructions,
      current_tasks: taskSummaries,
      recently_completed_tasks: recentlyCompletedTasks,
      friction_alerts: frictionAlerts,
      recent_activity: recentActivity,
      analytics_snapshot: analytics,
      conversation_history: conversationHistory,
    }
  }

  // Full tier: include raw activity logs and focus sessions (last 14 days, limited)
  if (tier === 'full') {
    const [activityLogs, focusSessions] = await Promise.all([
      getActivityLogs(supabase, user.id),
      getFocusSessions(supabase, user.id),
    ])

    const dataSummary: DataSummary = {
      active_task_count: taskSummaries.length,
      completed_task_count: recentlyCompletedTasks.length,
      activity_log_count: activityLogs.length,
      focus_session_count: focusSessions.length,
    }

    return {
      tier: 'full',
      tier_description: `Full: ${dataSummary.active_task_count} tasks, ${dataSummary.activity_log_count} logs, ${dataSummary.focus_session_count} sessions (14 days)`,
      data_summary: dataSummary,
      loaded_at: loadedAt,
      user_summary: {
        timezone: profile.timezone || 'America/Los_Angeles',
        total_tasks: tasks.length,
        wip_count: wipCount,
        projects: projectSummaries,
      },
      user_instructions: profile.ai_instructions,
      current_tasks: taskSummaries,
      recently_completed_tasks: recentlyCompletedTasks,
      friction_alerts: frictionAlerts,
      recent_activity: recentActivity,
      analytics_snapshot: analytics,
      raw_data: {
        activity_logs: activityLogs,
        focus_sessions: focusSessions,
      },
      conversation_history: conversationHistory,
    }
  }

  // Max tier: ALL historical data, no limits
  const [activityLogsMax, focusSessionsMax, allCompletedTasks] = await Promise.all([
    getActivityLogsMax(supabase, user.id),
    getFocusSessionsMax(supabase, user.id),
    getAllCompletedTasks(supabase, user.id),
  ])

  const dataSummaryMax: DataSummary = {
    active_task_count: taskSummaries.length,
    completed_task_count: allCompletedTasks.length,
    activity_log_count: activityLogsMax.length,
    focus_session_count: focusSessionsMax.length,
  }

  return {
    tier: 'max',
    tier_description: `Max: ${dataSummaryMax.active_task_count} active tasks, ${dataSummaryMax.completed_task_count} completed (all time), ${dataSummaryMax.activity_log_count} logs, ${dataSummaryMax.focus_session_count} sessions`,
    data_summary: dataSummaryMax,
    loaded_at: loadedAt,
    user_summary: {
      timezone: profile.timezone || 'America/Los_Angeles',
      total_tasks: tasks.length,
      wip_count: wipCount,
      projects: projectSummaries,
    },
    user_instructions: profile.ai_instructions,
    current_tasks: taskSummaries,
    recently_completed_tasks: allCompletedTasks,
    friction_alerts: frictionAlerts,
    recent_activity: recentActivity,
    analytics_snapshot: analytics,
    raw_data: {
      activity_logs: activityLogsMax,
      focus_sessions: focusSessionsMax,
    },
    conversation_history: conversationHistory,
  }
}

// Helper functions for data fetching

async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('timezone, ai_instructions, ai_preferences')
    .eq('id', userId)
    .single()
  return data || { timezone: 'America/Los_Angeles', ai_instructions: null, ai_preferences: null }
}

async function getActiveTasks(supabase: SupabaseClient, userId: string): Promise<Task[]> {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('updated_at', { ascending: false })
    .limit(100) // Limit for context window

  return (data as Task[]) || []
}

async function getProjects(supabase: SupabaseClient, userId: string): Promise<Project[]> {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)

  return (data as Project[]) || []
}

async function getRecentlyCompletedTasks(supabase: SupabaseClient, userId: string): Promise<CompletedTaskSummary[]> {
  // Get tasks completed in the last 14 days
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data } = await supabase
    .from('tasks')
    .select('id, title, project_id, completed_at, estimate_hours, actual_hours, projects(name)')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('completed_at', twoWeeksAgo.toISOString())
    .order('completed_at', { ascending: false })
    .limit(50)

  return (data || []).map(task => {
    const projectData = task.projects as { name: string } | { name: string }[] | null
    const projectName = Array.isArray(projectData)
      ? projectData[0]?.name
      : projectData?.name
    return {
      id: task.id,
      title: task.title,
      project_name: projectName || 'Unknown',
      completed_at: task.completed_at,
      estimate_hours: task.estimate_hours,
      actual_hours: task.actual_hours,
    }
  })
}

async function getFrictionAlerts(supabase: SupabaseClient, userId: string, projects?: Project[]): Promise<FrictionAlertSummary[]> {
  const alerts: FrictionAlertSummary[] = []
  const now = new Date()
  const days3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const today = now.toISOString().split('T')[0]

  // Use passed projects or fetch if not provided (for backwards compatibility)
  const projectList = projects || (await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', userId)).data || []

  const projectMap = new Map(projectList.map(p => [p.id, p.name]))

  // 1. Tasks stuck in "today" for 3+ days
  const { data: stuckTasks } = await supabase
    .from('tasks')
    .select('id, title, project_id, updated_at')
    .eq('user_id', userId)
    .eq('status', 'today')
    .lt('updated_at', days3Ago)

  for (const task of stuckTasks || []) {
    const daysStuck = Math.floor((now.getTime() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      type: 'stuck_today',
      task_id: task.id,
      task_title: task.title,
      detail: `Stuck in Today for ${daysStuck} days`,
    })
  }

  // 2. Overdue tasks
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, project_id, due_date')
    .eq('user_id', userId)
    .neq('status', 'done')
    .lt('due_date', today)

  for (const task of overdueTasks || []) {
    const daysOverdue = Math.floor((now.getTime() - new Date(task.due_date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      type: 'overdue',
      task_id: task.id,
      task_title: task.title,
      detail: `Overdue by ${daysOverdue} days`,
    })
  }

  // 3. High churn tasks (moved 3+ times in activity log)
  const { data: activityLogs } = await supabase
    .from('activity_logs')
    .select('task_id')
    .eq('user_id', userId)
    .eq('action', 'move')
    .gte('created_at', days7Ago)

  // Count moves per task
  const moveCounts = new Map<string, number>()
  for (const log of activityLogs || []) {
    if (log.task_id) {
      moveCounts.set(log.task_id, (moveCounts.get(log.task_id) || 0) + 1)
    }
  }

  // Find tasks with 3+ moves
  const highChurnTaskIds = Array.from(moveCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([id]) => id)

  if (highChurnTaskIds.length > 0) {
    const { data: churnTasks } = await supabase
      .from('tasks')
      .select('id, title, project_id')
      .in('id', highChurnTaskIds)
      .neq('status', 'done')

    for (const task of churnTasks || []) {
      const moveCount = moveCounts.get(task.id) || 0
      alerts.push({
        type: 'high_churn',
        task_id: task.id,
        task_title: task.title,
        detail: `Moved ${moveCount} times in the last 7 days`,
      })
    }
  }

  // 4. Stale tasks (untouched for 7+ days, not in someday)
  const { data: staleTasks } = await supabase
    .from('tasks')
    .select('id, title, project_id, updated_at')
    .eq('user_id', userId)
    .not('status', 'in', '("done","someday")')
    .lt('updated_at', days7Ago)
    .limit(10)

  for (const task of staleTasks || []) {
    const daysSinceUpdate = Math.floor((now.getTime() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      type: 'stale',
      task_id: task.id,
      task_title: task.title,
      detail: `Untouched for ${daysSinceUpdate} days`,
    })
  }

  return alerts
}

interface WeeklyStatsResult {
  totalHours: number
  tasksCompleted: number
  avgCycleTimeDays: number | null
  deepWorkPercent: number | null
  estimateAccuracy: number | null
}

async function getWeeklyStats(supabase: SupabaseClient, userId: string): Promise<WeeklyStatsResult> {
  // Get start of this week (Sunday)
  const now = new Date()
  const day = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - day)
  weekStart.setHours(0, 0, 0, 0)
  const weekStartISO = weekStart.toISOString()

  // Get hours this week from focus sessions (include task energy_level via join to avoid N+1)
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('duration_minutes, task_id, tasks(energy_level)')
    .eq('user_id', userId)
    .gte('started_at', weekStartISO)
    .not('ended_at', 'is', null)

  const totalMinutes = sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  // Get tasks completed this week
  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('id, created_at, completed_at, estimate_hours, actual_hours, energy_level')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('completed_at', weekStartISO)

  const tasksCompleted = completedTasks?.length || 0

  // Calculate average cycle time
  let avgCycleTimeDays: number | null = null
  if (completedTasks && completedTasks.length > 0) {
    const cycleTimes = completedTasks.map(t => {
      const created = new Date(t.created_at).getTime()
      const completed = new Date(t.completed_at!).getTime()
      return (completed - created) / (1000 * 60 * 60 * 24)
    })
    avgCycleTimeDays = Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length * 10) / 10
  }

  // Calculate deep work percentage (high energy tasks) - uses joined task data
  let deepWorkPercent: number | null = null
  if (sessions && sessions.length > 0) {
    let highEnergyMinutes = 0
    for (const session of sessions) {
      const taskData = session.tasks as { energy_level: string } | { energy_level: string }[] | null
      const energyLevel = Array.isArray(taskData) ? taskData[0]?.energy_level : taskData?.energy_level
      if (energyLevel === 'high') {
        highEnergyMinutes += session.duration_minutes || 0
      }
    }

    deepWorkPercent = totalMinutes > 0 ? Math.round(highEnergyMinutes / totalMinutes * 100) : 0
  }

  // Calculate estimate accuracy
  let estimateAccuracy: number | null = null
  if (completedTasks && completedTasks.length > 0) {
    const tasksWithBoth = completedTasks.filter(t => t.estimate_hours && t.actual_hours && t.estimate_hours > 0)
    if (tasksWithBoth.length > 0) {
      const ratios = tasksWithBoth.map(t => t.actual_hours! / t.estimate_hours!)
      estimateAccuracy = Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100) / 100
    }
  }

  return {
    totalHours,
    tasksCompleted,
    avgCycleTimeDays,
    deepWorkPercent,
    estimateAccuracy,
  }
}

async function getRecentActivity(supabase: SupabaseClient, userId: string): Promise<ActivitySummary[]> {
  const { data } = await supabase
    .from('activity_logs')
    .select('action, created_at, task_id, tasks(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data || []).map(a => {
    // tasks can be an array or single object depending on the join
    const taskData = a.tasks as { title: string } | { title: string }[] | null
    const taskTitle = Array.isArray(taskData)
      ? taskData[0]?.title
      : taskData?.title
    return {
      action: a.action,
      task_title: taskTitle || 'Unknown',
      timestamp: a.created_at,
    }
  })
}

async function getConversationHistory(supabase: SupabaseClient, conversationId: string): Promise<MessageSummary[]> {
  const { data } = await supabase
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(50)

  return (data || []).map(m => ({
    role: m.role,
    content: m.content,
    timestamp: m.created_at,
  }))
}

/**
 * Get full activity logs for the full context tier.
 * Includes all fields and changes for detailed analysis.
 */
async function getActivityLogs(supabase: SupabaseClient, userId: string): Promise<ActivityLogRecord[]> {
  // Get activity logs from the last 14 days
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data } = await supabase
    .from('activity_logs')
    .select('id, task_id, project_id, action, changes, created_at, tasks(title)')
    .eq('user_id', userId)
    .gte('created_at', twoWeeksAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  return (data || []).map(log => {
    const taskData = log.tasks as { title: string } | { title: string }[] | null
    const taskTitle = Array.isArray(taskData)
      ? taskData[0]?.title
      : taskData?.title

    return {
      id: log.id,
      task_id: log.task_id,
      task_title: taskTitle || null,
      project_id: log.project_id,
      action: log.action,
      changes: log.changes as Record<string, { old: unknown; new: unknown }> | null,
      created_at: log.created_at,
    }
  })
}

/**
 * Get full focus sessions for the full context tier.
 * Includes all fields for detailed time analysis.
 */
async function getFocusSessions(supabase: SupabaseClient, userId: string): Promise<FocusSessionRecord[]> {
  // Get focus sessions from the last 14 days
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data } = await supabase
    .from('focus_sessions')
    .select('id, task_id, started_at, ended_at, duration_minutes, notes, tasks(title)')
    .eq('user_id', userId)
    .gte('started_at', twoWeeksAgo.toISOString())
    .order('started_at', { ascending: false })
    .limit(100)

  return (data || []).map(session => {
    const taskData = session.tasks as { title: string } | { title: string }[] | null
    const taskTitle = Array.isArray(taskData)
      ? taskData[0]?.title
      : taskData?.title

    return {
      id: session.id,
      task_id: session.task_id,
      task_title: taskTitle || null,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_minutes: session.duration_minutes,
      notes: session.notes,
    }
  })
}

// ============================================================
// MAX TIER FUNCTIONS - No date/count limits for complete history
// ============================================================

/**
 * Get ALL activity logs for the max context tier.
 * No date or count limits - complete history.
 */
async function getActivityLogsMax(supabase: SupabaseClient, userId: string): Promise<ActivityLogRecord[]> {
  const { data } = await supabase
    .from('activity_logs')
    .select('id, task_id, project_id, action, changes, created_at, tasks(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500) // Cap to prevent memory/timeout issues

  return (data || []).map(log => {
    const taskData = log.tasks as { title: string } | { title: string }[] | null
    const taskTitle = Array.isArray(taskData)
      ? taskData[0]?.title
      : taskData?.title

    return {
      id: log.id,
      task_id: log.task_id,
      task_title: taskTitle || null,
      project_id: log.project_id,
      action: log.action,
      changes: log.changes as Record<string, { old: unknown; new: unknown }> | null,
      created_at: log.created_at,
    }
  })
}

/**
 * Get ALL focus sessions for the max context tier.
 * No date or count limits - complete history.
 */
async function getFocusSessionsMax(supabase: SupabaseClient, userId: string): Promise<FocusSessionRecord[]> {
  const { data } = await supabase
    .from('focus_sessions')
    .select('id, task_id, started_at, ended_at, duration_minutes, notes, tasks(title)')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(500) // Cap to prevent memory/timeout issues

  return (data || []).map(session => {
    const taskData = session.tasks as { title: string } | { title: string }[] | null
    const taskTitle = Array.isArray(taskData)
      ? taskData[0]?.title
      : taskData?.title

    return {
      id: session.id,
      task_id: session.task_id,
      task_title: taskTitle || null,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_minutes: session.duration_minutes,
      notes: session.notes,
    }
  })
}

/**
 * Get ALL completed tasks for the max context tier.
 * No date limit - complete history of all completed tasks.
 */
async function getAllCompletedTasks(supabase: SupabaseClient, userId: string): Promise<CompletedTaskSummary[]> {
  const { data } = await supabase
    .from('tasks')
    .select('id, title, project_id, completed_at, estimate_hours, actual_hours, projects(name)')
    .eq('user_id', userId)
    .eq('status', 'done')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(500) // Cap to prevent memory/timeout issues

  return (data || []).map(task => {
    const projectData = task.projects as { name: string } | { name: string }[] | null
    const projectName = Array.isArray(projectData)
      ? projectData[0]?.name
      : projectData?.name
    return {
      id: task.id,
      title: task.title,
      project_name: projectName || 'Unknown',
      completed_at: task.completed_at,
      estimate_hours: task.estimate_hours,
      actual_hours: task.actual_hours,
    }
  })
}
