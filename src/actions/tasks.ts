'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTaskSchema, updateTaskSchema, completeTaskSchema } from '@/lib/validations'
import type { CreateTaskInput, UpdateTaskInput, CompleteTaskInput } from '@/lib/validations'
import type { Task, TaskStatus } from '@/types/database'

// Helper to revalidate task-related paths (more targeted than full layout)
function revalidateTaskPaths() {
  revalidatePath('/inbox')
  revalidatePath('/today')
  revalidatePath('/calendar')
  revalidatePath('/archive')
  revalidatePath('/dashboard')
  revalidatePath('/projects', 'page')
}

// Helper to log activity
async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string,
  projectId: string,
  action: 'create' | 'update' | 'move' | 'complete' | 'reopen' | 'delete',
  changes?: Record<string, { old: unknown; new: unknown }>
) {
  await supabase.from('activity_logs').insert({
    user_id: userId,
    task_id: taskId,
    project_id: projectId,
    action,
    changes: changes || null,
    actor: 'user',
  })
}

// Helper to compute changes between old and new task
function computeChanges(
  oldTask: Partial<Task>,
  newTask: Partial<Task>
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  const fields: (keyof Task)[] = [
    'title', 'notes', 'status', 'priority',
    'start_date', 'due_date', 'estimate_hours',
    'project_id', 'energy_level', 'blocked_by'
  ]

  for (const field of fields) {
    if (field in newTask && oldTask[field] !== newTask[field]) {
      changes[field] = { old: oldTask[field], new: newTask[field] }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

// Helper to detect cyclic dependencies
async function hasCyclicDependency(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  blockedById: string,
  visited: Set<string> = new Set()
): Promise<boolean> {
  if (blockedById === taskId) return true
  if (visited.has(blockedById)) return false

  visited.add(blockedById)

  const { data: blockerTask } = await supabase
    .from('tasks')
    .select('blocked_by')
    .eq('id', blockedById)
    .single()

  if (!blockerTask?.blocked_by) return false

  return hasCyclicDependency(supabase, taskId, blockerTask.blocked_by, visited)
}

/**
 * Creates a new task in the specified project.
 * @param input - Task creation data (title, project_id, optional dates/priority/etc)
 * @returns Created task data or error message
 */
export async function createTask(input: CreateTaskInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = createTaskSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { title, notes, project_id, start_date, due_date, estimate_hours, status, priority, energy_level, blocked_by } = validated.data

  // Validate no cyclic dependency if blocked_by is set
  if (blocked_by) {
    const isCyclic = await hasCyclicDependency(supabase, '', blocked_by)
    if (isCyclic) {
      return { error: 'Cannot create a cyclic dependency' }
    }
  }

  // Get max sort_order for the project
  const { data: maxOrder } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('project_id', project_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = (maxOrder?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      project_id,
      title,
      notes: notes || null,
      start_date: start_date || null,
      due_date: due_date || null,
      estimate_hours: estimate_hours || null,
      status: status || 'inbox',
      priority: priority || '3',
      sort_order: sortOrder,
      energy_level: energy_level || null,
      blocked_by: blocked_by || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Log activity
  await logActivity(supabase, user.id, data.id, project_id, 'create')

  revalidateTaskPaths()
  return { data }
}

/**
 * Updates an existing task's fields.
 * Handles status changes including completion/reopening timestamps.
 * @param id - Task ID to update
 * @param input - Fields to update (title, notes, status, dates, etc)
 * @returns Updated task data or error message
 */
export async function updateTask(id: string, input: UpdateTaskInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = updateTaskSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Get old task for comparison
  const { data: oldTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (!oldTask) {
    return { error: 'Task not found' }
  }

  // Validate no cyclic dependency if blocked_by is being changed
  if (validated.data.blocked_by && validated.data.blocked_by !== oldTask.blocked_by) {
    const isCyclic = await hasCyclicDependency(supabase, id, validated.data.blocked_by)
    if (isCyclic) {
      return { error: 'Cannot create a cyclic dependency' }
    }
  }

  // Check if status is changing to/from done
  const isCompleting = validated.data.status === 'done' && oldTask.status !== 'done'
  const isReopening = oldTask.status === 'done' && validated.data.status && validated.data.status !== 'done'

  // Build update data with completed_at handling
  const updateData: Partial<Task> = {
    ...validated.data,
  }

  if (isCompleting) {
    updateData.completed_at = new Date().toISOString()
  } else if (isReopening) {
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Log activity with changes
  const changes = computeChanges(oldTask, validated.data)
  if (changes) {
    await logActivity(supabase, user.id, id, data.project_id, 'update', changes)
  }

  revalidateTaskPaths()
  return { data }
}

/**
 * Moves a task to a new status lane.
 * Handles completion timestamp when moving to/from 'done'.
 * @param id - Task ID to move
 * @param newStatus - Target status (inbox, today, next, waiting, blocked, someday, done)
 * @returns Updated task data or error message
 */
export async function moveTask(id: string, newStatus: TaskStatus) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get old task
  const { data: oldTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (!oldTask) {
    return { error: 'Task not found' }
  }

  const oldStatus = oldTask.status
  const isCompleting = newStatus === 'done' && oldStatus !== 'done'
  const isReopening = oldStatus === 'done' && newStatus !== 'done'

  const updateData: Partial<Task> = {
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
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Determine action type
  let action: 'move' | 'complete' | 'reopen' = 'move'
  if (isCompleting) action = 'complete'
  if (isReopening) action = 'reopen'

  await logActivity(supabase, user.id, id, data.project_id, action, {
    status: { old: oldStatus, new: newStatus }
  })

  revalidateTaskPaths()
  return { data }
}

export async function completeTask(id: string, input?: CompleteTaskInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  let validated = { actual_hours: null as number | null, outcome_note: null as string | null }
  if (input) {
    const result = completeTaskSchema.safeParse(input)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }
    validated = result.data as typeof validated
  }

  // Get old task
  const { data: oldTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (!oldTask) {
    return { error: 'Task not found' }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      actual_hours: validated.actual_hours,
      outcome_note: validated.outcome_note,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await logActivity(supabase, user.id, id, data.project_id, 'complete', {
    status: { old: oldTask.status, new: 'done' }
  })

  revalidateTaskPaths()
  return { data }
}

export async function deleteTask(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get task before deleting for logging
  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single()

  if (!task) {
    return { error: 'Task not found' }
  }

  // Log before deleting (task_id will be SET NULL after delete due to FK)
  await logActivity(supabase, user.id, id, task.project_id, 'delete')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidateTaskPaths()
  return { success: true }
}

export async function getTasksByProject(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getTasksByStatus(status: TaskStatus) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('user_id', user.id)
    .eq('status', status)
    .order('sort_order')

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getCompletedTasks(filter?: { startDate?: string; endDate?: string; projectId?: string }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  let query = supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .order('completed_at', { ascending: false })

  if (filter?.startDate) {
    query = query.gte('completed_at', filter.startDate)
  }
  if (filter?.endDate) {
    query = query.lte('completed_at', filter.endDate)
  }
  if (filter?.projectId) {
    query = query.eq('project_id', filter.projectId)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

/**
 * Retrieves tasks for calendar view within a date range.
 * @param startDate - ISO date string (YYYY-MM-DD) for range start
 * @param endDate - ISO date string (YYYY-MM-DD) for range end
 * @returns Object with dueTasks, startTasks, and completedTasks arrays
 */
export async function getTasksForCalendar(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get tasks with due dates in the range
  const { data: dueTasks, error: dueError } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('user_id', user.id)
    .neq('status', 'done')
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date')

  if (dueError) {
    return { error: dueError.message, data: null }
  }

  // Get tasks with start dates in the range
  const { data: startTasks, error: startError } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('user_id', user.id)
    .neq('status', 'done')
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('start_date')

  if (startError) {
    return { error: startError.message, data: null }
  }

  // Get completed tasks in the range
  // Note: completed_at is stored as ISO timestamp, so we need to include time components
  const { data: completedTasks, error: completedError } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .gte('completed_at', `${startDate}T00:00:00.000Z`)
    .lte('completed_at', `${endDate}T23:59:59.999Z`)
    .order('completed_at')

  if (completedError) {
    return { error: completedError.message, data: null }
  }

  return {
    data: {
      dueTasks: dueTasks || [],
      startTasks: startTasks || [],
      completedTasks: completedTasks || [],
    }
  }
}

export async function getAvailableBlockers(taskId?: string, projectId?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  let query = supabase
    .from('tasks')
    .select('id, title, status, project_id')
    .eq('user_id', user.id)
    .neq('status', 'done')
    .order('title')

  // Optionally filter by project
  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  // Exclude the task itself if editing
  if (taskId) {
    query = query.neq('id', taskId)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getInProgressTasksForCalendar(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get tasks that:
  // - Have a start_date that is on or before the end of this week (started before or during this week)
  // - Are NOT done
  // - Either have no due_date, or have a due_date on or after the start of this week
  // This shows tasks that span into or through this week
  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('user_id', user.id)
    .neq('status', 'done')
    .not('start_date', 'is', null)
    .lte('start_date', endDate) // Started on or before end of this week
    .order('start_date')

  if (error) {
    return { error: error.message, data: null }
  }

  // Filter in JS: only include tasks where due_date is null or >= startDate
  // (to exclude tasks that were due before this week started)
  const filteredTasks = data?.filter(task => {
    if (!task.due_date) return true // No due date means still in progress
    return task.due_date >= startDate // Due date is within or after this week
  }) || []

  return { data: filteredTasks }
}

export async function rescheduleTask(
  taskId: string,
  newDate: string,
  dateField: 'due_date' | 'start_date'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the task to verify ownership and for activity logging
  const { data: oldTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (!oldTask) {
    return { error: 'Task not found' }
  }

  // Don't allow rescheduling completed tasks
  if (oldTask.status === 'done') {
    return { error: 'Cannot reschedule completed tasks' }
  }

  const updateData: Partial<Task> = {
    [dateField]: newDate,
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Log the activity
  await logActivity(supabase, user.id, taskId, data.project_id, 'update', {
    [dateField]: { old: oldTask[dateField], new: newDate }
  })

  revalidateTaskPaths()
  return { data }
}

export async function getTaskWithBlocker(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  // If task has a blocker, fetch the blocker details
  let blockingTask = null
  if (task.blocked_by) {
    const { data: blocker } = await supabase
      .from('tasks')
      .select('id, title, status')
      .eq('id', task.blocked_by)
      .single()

    blockingTask = blocker
  }

  return { data: { ...task, blocking_task: blockingTask } }
}
