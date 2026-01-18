'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTaskSchema, updateTaskSchema, completeTaskSchema } from '@/lib/validations'
import type { CreateTaskInput, UpdateTaskInput, CompleteTaskInput } from '@/lib/validations'
import type { Task, TaskStatus } from '@/types/database'

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
    'project_id'
  ]

  for (const field of fields) {
    if (field in newTask && oldTask[field] !== newTask[field]) {
      changes[field] = { old: oldTask[field], new: newTask[field] }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

export async function createTask(input: CreateTaskInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = createTaskSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const { title, notes, project_id, start_date, due_date, estimate_hours, status, priority } = validated.data

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
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Log activity
  await logActivity(supabase, user.id, data.id, project_id, 'create')

  revalidatePath('/', 'layout')
  return { data }
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = updateTaskSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
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

  const { data, error } = await supabase
    .from('tasks')
    .update(validated.data)
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

  revalidatePath('/', 'layout')
  return { data }
}

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

  revalidatePath('/', 'layout')
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
      return { error: result.error.errors[0].message }
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

  revalidatePath('/', 'layout')
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

  revalidatePath('/', 'layout')
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
  const { data: completedTasks, error: completedError } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
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
