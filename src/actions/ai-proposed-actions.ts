'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  applyProposedActionSchema,
  rejectProposedActionSchema,
  type ApplyProposedActionInput,
  type RejectProposedActionInput
} from '@/lib/validations'
import type { ActionType, AIProposedAction } from '@/types/ai'
import type { TaskStatus, TaskPriority, EnergyLevel } from '@/types/database'

// Helper to revalidate after action
function revalidateActionPaths() {
  revalidatePath('/inbox')
  revalidatePath('/today')
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  revalidatePath('/projects', 'page')
}

/**
 * Apply a proposed action from the AI assistant.
 * Logs the change with actor='ai_assistant'.
 */
export async function applyProposedAction(input: ApplyProposedActionInput): Promise<{
  data?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = applyProposedActionSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Get the proposed action
  const { data: action, error: actionError } = await supabase
    .from('ai_proposed_actions')
    .select('*')
    .eq('id', validated.data.action_id)
    .eq('user_id', user.id)
    .single()

  if (actionError || !action) {
    return { error: 'Proposed action not found' }
  }

  if (action.status !== 'pending') {
    return { error: `Action already ${action.status}` }
  }

  if (new Date(action.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from('ai_proposed_actions')
      .update({ status: 'expired' })
      .eq('id', action.id)
    return { error: 'Action has expired' }
  }

  // Execute the action based on type
  const result = await executeAction(
    supabase,
    user.id,
    action.action_type as ActionType,
    action.proposed_data as Record<string, unknown>,
    action.target_task_id,
    action.target_project_id
  )

  if (result.error) {
    return { error: result.error }
  }

  // Update action status
  await supabase
    .from('ai_proposed_actions')
    .update({
      status: 'approved',
      applied_at: new Date().toISOString(),
    })
    .eq('id', action.id)

  revalidateActionPaths()

  return { data: result.data }
}

/**
 * Reject a proposed action.
 */
export async function rejectProposedAction(input: RejectProposedActionInput): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = rejectProposedActionSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { error } = await supabase
    .from('ai_proposed_actions')
    .update({ status: 'rejected' })
    .eq('id', validated.data.action_id)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Get pending actions for a conversation.
 */
export async function getPendingActions(conversationId: string): Promise<{
  data?: AIProposedAction[]
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('ai_proposed_actions')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data: data as AIProposedAction[] }
}

/**
 * Get all pending actions for the current user.
 */
export async function getAllPendingActions(): Promise<{
  data?: AIProposedAction[]
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('ai_proposed_actions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data: data as AIProposedAction[] }
}

// Helper function to execute different action types
async function executeAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  actionType: ActionType,
  proposedData: Record<string, unknown>,
  targetTaskId: string | null,
  targetProjectId: string | null
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  switch (actionType) {
    case 'create_task': {
      const title = proposedData.title as string
      const projectId = (proposedData.project_id as string) || targetProjectId

      if (!title || !projectId) {
        return { error: 'Missing required fields for task creation' }
      }

      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      const sortOrder = (maxOrder?.sort_order ?? -1) + 1

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          project_id: projectId,
          title: title,
          notes: (proposedData.notes as string) || null,
          status: (proposedData.status as TaskStatus) || 'inbox',
          priority: (proposedData.priority as TaskPriority) || '3',
          start_date: (proposedData.start_date as string) || null,
          due_date: (proposedData.due_date as string) || null,
          estimate_hours: (proposedData.estimate_hours as number) || null,
          energy_level: (proposedData.energy_level as EnergyLevel) || null,
          sort_order: sortOrder,
        })
        .select()
        .single()

      if (error) return { error: error.message }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userId,
        task_id: data.id,
        project_id: projectId,
        action: 'create',
        actor: 'ai_assistant',
      })

      return { data }
    }

    case 'update_task': {
      if (!targetTaskId) {
        return { error: 'Target task ID required for update' }
      }

      // Get original task
      const { data: originalTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', targetTaskId)
        .eq('user_id', userId)
        .single()

      if (!originalTask) {
        return { error: 'Task not found' }
      }

      // Build update object (only include fields that are in proposedData)
      const updateFields: Record<string, unknown> = {}
      const allowedFields = ['title', 'notes', 'project_id', 'start_date', 'due_date', 'estimate_hours', 'priority', 'energy_level', 'blocked_by']

      for (const field of allowedFields) {
        if (field in proposedData) {
          updateFields[field] = proposedData[field]
        }
      }

      if (Object.keys(updateFields).length === 0) {
        return { error: 'No fields to update' }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateFields)
        .eq('id', targetTaskId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) return { error: error.message }

      // Compute and log changes
      const changes: Record<string, { old: unknown; new: unknown }> = {}
      for (const [key, value] of Object.entries(updateFields)) {
        if (originalTask[key as keyof typeof originalTask] !== value) {
          changes[key] = {
            old: originalTask[key as keyof typeof originalTask],
            new: value,
          }
        }
      }

      if (Object.keys(changes).length > 0) {
        await supabase.from('activity_logs').insert({
          user_id: userId,
          task_id: targetTaskId,
          project_id: data.project_id,
          action: 'update',
          changes,
          actor: 'ai_assistant',
        })
      }

      return { data }
    }

    case 'move_task': {
      if (!targetTaskId) {
        return { error: 'Target task ID required for move' }
      }

      const newStatus = proposedData.status as TaskStatus
      if (!newStatus) {
        return { error: 'New status required for move' }
      }

      const { data: originalTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', targetTaskId)
        .eq('user_id', userId)
        .single()

      if (!originalTask) {
        return { error: 'Task not found' }
      }

      const isCompleting = newStatus === 'done' && originalTask.status !== 'done'
      const isReopening = originalTask.status === 'done' && newStatus !== 'done'

      const updateData: Record<string, unknown> = {
        status: newStatus,
      }

      if (isCompleting) {
        updateData.completed_at = new Date().toISOString()
      } else if (isReopening) {
        updateData.completed_at = null
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', targetTaskId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) return { error: error.message }

      let action: 'move' | 'complete' | 'reopen' = 'move'
      if (isCompleting) action = 'complete'
      if (isReopening) action = 'reopen'

      await supabase.from('activity_logs').insert({
        user_id: userId,
        task_id: targetTaskId,
        project_id: data.project_id,
        action,
        changes: { status: { old: originalTask.status, new: newStatus } },
        actor: 'ai_assistant',
      })

      return { data }
    }

    case 'complete_task': {
      if (!targetTaskId) {
        return { error: 'Target task ID required' }
      }

      const { data: originalTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', targetTaskId)
        .eq('user_id', userId)
        .single()

      if (!originalTask) {
        return { error: 'Task not found' }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          actual_hours: (proposedData.actual_hours as number) || originalTask.actual_hours,
          outcome_note: (proposedData.outcome_note as string) || null,
        })
        .eq('id', targetTaskId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) return { error: error.message }

      await supabase.from('activity_logs').insert({
        user_id: userId,
        task_id: targetTaskId,
        project_id: data.project_id,
        action: 'complete',
        changes: { status: { old: originalTask.status, new: 'done' } },
        actor: 'ai_assistant',
      })

      return { data }
    }

    case 'delete_task': {
      if (!targetTaskId) {
        return { error: 'Target task ID required' }
      }

      const { data: task } = await supabase
        .from('tasks')
        .select('project_id, title')
        .eq('id', targetTaskId)
        .eq('user_id', userId)
        .single()

      if (!task) {
        return { error: 'Task not found' }
      }

      // Log before deleting
      await supabase.from('activity_logs').insert({
        user_id: userId,
        task_id: targetTaskId,
        project_id: task.project_id,
        action: 'delete',
        actor: 'ai_assistant',
      })

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', targetTaskId)
        .eq('user_id', userId)

      if (error) return { error: error.message }

      return { data: { deleted: true, title: task.title } }
    }

    case 'create_project': {
      const name = proposedData.name as string
      if (!name) {
        return { error: 'Project name required' }
      }

      // Generate slug
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from('projects')
        .select('sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      const sortOrder = (maxOrder?.sort_order ?? -1) + 1

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name,
          slug: `${slug}-${Date.now()}`,
          description: (proposedData.description as string) || null,
          color: (proposedData.color as string) || '#6366f1',
          is_system: false,
          is_archived: false,
          sort_order: sortOrder,
        })
        .select()
        .single()

      if (error) return { error: error.message }

      return { data }
    }

    default:
      return { error: `Unknown action type: ${actionType}` }
  }
}
