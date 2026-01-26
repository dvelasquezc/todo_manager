'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseBrainDumpSchema, confirmBrainDumpSchema } from '@/lib/validations'
import type { ParseBrainDumpInput, ConfirmBrainDumpInput } from '@/lib/validations'
import { parseTasksFromText, type ParsedTask } from '@/lib/ai/claude'

// Helper to revalidate task-related paths after brain dump
function revalidateTaskPaths() {
  revalidatePath('/inbox')
  revalidatePath('/today')
  revalidatePath('/calendar')
  revalidatePath('/projects', 'page')
}

export async function parseBrainDump(input: ParseBrainDumpInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = parseBrainDumpSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Get user's projects for matching
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('is_archived', false)

  if (projectsError) {
    return { error: projectsError.message }
  }

  // Verify default project exists
  const defaultProject = projects?.find(p => p.id === validated.data.default_project_id)
  if (!defaultProject) {
    return { error: 'Default project not found' }
  }

  try {
    // Parse tasks using Claude
    const parsedTasks = await parseTasksFromText(
      validated.data.input,
      projects || [],
      validated.data.default_project_id
    )

    if (parsedTasks.length === 0) {
      return { error: 'No tasks could be extracted from the input' }
    }

    // Create brain dump session record
    const { data: session, error: sessionError } = await supabase
      .from('brain_dump_sessions')
      .insert({
        user_id: user.id,
        default_project_id: validated.data.default_project_id,
        raw_input: validated.data.input,
        parsed_count: parsedTasks.length,
      })
      .select()
      .single()

    if (sessionError) {
      return { error: sessionError.message }
    }

    return {
      data: {
        session_id: session.id,
        tasks: parsedTasks,
      }
    }
  } catch (error) {
    console.error('Brain dump parse error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to parse tasks' }
  }
}

export async function confirmBrainDump(input: ConfirmBrainDumpInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = confirmBrainDumpSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Verify session exists and belongs to user
  const { data: session } = await supabase
    .from('brain_dump_sessions')
    .select('id')
    .eq('id', validated.data.session_id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return { error: 'Session not found' }
  }

  // Get user's projects to validate project_ids
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', user.id)

  const projectIds = new Set(projects?.map(p => p.id) || [])

  // Create tasks
  const createdTasks = []
  for (const taskInput of validated.data.tasks) {
    // Validate project_id belongs to user
    if (!projectIds.has(taskInput.project_id)) {
      continue // Skip tasks with invalid project
    }

    // Get max sort_order for the project
    const { data: maxOrder } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('project_id', taskInput.project_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const sortOrder = (maxOrder?.sort_order ?? -1) + 1

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        project_id: taskInput.project_id,
        title: taskInput.title,
        notes: taskInput.notes || null,
        start_date: taskInput.start_date || null,
        due_date: taskInput.due_date || null,
        estimate_hours: taskInput.estimate_hours || null,
        status: 'inbox',
        priority: taskInput.priority || '3',
        energy_level: taskInput.energy_level || null,
        brain_dump_id: validated.data.session_id,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (!taskError && task) {
      createdTasks.push(task)

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        task_id: task.id,
        project_id: taskInput.project_id,
        action: 'create',
        actor: 'brain_dump',
      })
    }
  }

  // Update session with actual created count
  await supabase
    .from('brain_dump_sessions')
    .update({ parsed_count: createdTasks.length })
    .eq('id', validated.data.session_id)

  revalidateTaskPaths()
  return {
    data: {
      created_count: createdTasks.length,
      tasks: createdTasks,
    }
  }
}

export async function getBrainDumpSessions(limit = 10) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('brain_dump_sessions')
    .select('*, default_project:projects(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}
