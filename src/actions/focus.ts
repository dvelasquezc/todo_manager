'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createFocusSessionSchema,
  endFocusSessionSchema,
  updateFocusSessionSchema,
  createManualFocusSessionSchema,
  deleteFocusSessionSchema,
} from '@/lib/validations'
import { invalidateCache } from '@/lib/ai/context/cache'

// Helper to revalidate focus-related paths (more targeted than full layout)
function revalidateFocusPaths() {
  revalidatePath('/inbox')
  revalidatePath('/today')
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  revalidatePath('/projects', 'page')
}
import type {
  CreateFocusSessionInput,
  EndFocusSessionInput,
  UpdateFocusSessionInput,
  CreateManualFocusSessionInput,
  DeleteFocusSessionInput,
} from '@/lib/validations'

export async function startFocusSession(input: CreateFocusSessionInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = createFocusSessionSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Check if there's already an active session
  const { data: activeSession } = await supabase
    .from('focus_sessions')
    .select('id')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .single()

  if (activeSession) {
    return { error: 'You already have an active focus session. End it first.' }
  }

  // Verify task exists and belongs to user
  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', validated.data.task_id)
    .eq('user_id', user.id)
    .single()

  if (!task) {
    return { error: 'Task not found' }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: user.id,
      task_id: validated.data.task_id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidateFocusPaths()
  return { data }
}

export async function endFocusSession(input: EndFocusSessionInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = endFocusSessionSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Get the session
  const { data: session } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', validated.data.session_id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return { error: 'Session not found' }
  }

  if (session.ended_at) {
    return { error: 'Session already ended' }
  }

  const endedAt = new Date()
  const startedAt = new Date(session.started_at)
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
      notes: validated.data.notes || null,
    })
    .eq('id', validated.data.session_id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Update task's actual_hours
  const { data: task } = await supabase
    .from('tasks')
    .select('actual_hours')
    .eq('id', session.task_id)
    .single()

  if (task) {
    const currentHours = task.actual_hours || 0
    const newHours = currentHours + (durationMinutes / 60)

    await supabase
      .from('tasks')
      .update({ actual_hours: Math.round(newHours * 100) / 100 })
      .eq('id', session.task_id)
  }

  // Invalidate AI context cache since focus session ended (actual_hours changed)
  await invalidateCache(user.id)

  revalidateFocusPaths()
  return { data }
}

export async function getActiveFocusSession() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, task:tasks(id, title, project:projects(id, name, color))')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getFocusSessionsForTask(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .order('started_at', { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getTodayFocusSummary() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get start of today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const { data: sessions, error } = await supabase
    .from('focus_sessions')
    .select('*, task:tasks(id, title)')
    .eq('user_id', user.id)
    .gte('started_at', todayISO)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  // Compute summary
  const totalMinutes = sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0
  const taskCount = new Set(sessions?.map(s => s.task_id)).size

  return {
    data: {
      sessions: sessions || [],
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      taskCount,
    }
  }
}

// Helper to recalculate task's actual_hours from all sessions
async function recalculateTaskActualHours(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string
) {
  // Get all completed sessions for this task
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('duration_minutes')
    .eq('task_id', taskId)
    .not('ended_at', 'is', null)

  if (!sessions) return

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)
  const totalHours = Math.round(totalMinutes / 60 * 100) / 100

  await supabase
    .from('tasks')
    .update({ actual_hours: totalHours })
    .eq('id', taskId)
}

export async function updateFocusSession(input: UpdateFocusSessionInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = updateFocusSessionSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Get the session to verify ownership and get task_id
  const { data: session } = await supabase
    .from('focus_sessions')
    .select('*, task:tasks(id)')
    .eq('id', validated.data.session_id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return { error: 'Session not found' }
  }

  if (!session.ended_at) {
    return { error: 'Cannot edit an active session. End it first.' }
  }

  const updateData: Record<string, unknown> = {}
  if (validated.data.duration_minutes !== undefined) {
    updateData.duration_minutes = validated.data.duration_minutes
  }
  if (validated.data.notes !== undefined) {
    updateData.notes = validated.data.notes
  }

  if (Object.keys(updateData).length === 0) {
    return { error: 'No changes provided' }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .update(updateData)
    .eq('id', validated.data.session_id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Recalculate task's actual_hours
  await recalculateTaskActualHours(supabase, session.task_id)

  revalidateFocusPaths()
  return { data }
}

export async function createManualFocusSession(input: CreateManualFocusSessionInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = createManualFocusSessionSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Verify task exists and belongs to user
  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', validated.data.task_id)
    .eq('user_id', user.id)
    .single()

  if (!task) {
    return { error: 'Task not found' }
  }

  // Calculate ended_at from started_at + duration
  const startedAt = new Date(validated.data.started_at)
  const endedAt = new Date(startedAt.getTime() + validated.data.duration_minutes * 60000)

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: user.id,
      task_id: validated.data.task_id,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_minutes: validated.data.duration_minutes,
      notes: validated.data.notes || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Recalculate task's actual_hours
  await recalculateTaskActualHours(supabase, validated.data.task_id)

  // Invalidate AI context cache since focus session added
  await invalidateCache(user.id)

  revalidateFocusPaths()
  return { data }
}

export async function deleteFocusSession(input: DeleteFocusSessionInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = deleteFocusSessionSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Get the session to verify ownership and get task_id
  const { data: session } = await supabase
    .from('focus_sessions')
    .select('task_id, ended_at')
    .eq('id', validated.data.session_id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return { error: 'Session not found' }
  }

  if (!session.ended_at) {
    return { error: 'Cannot delete an active session. End it first.' }
  }

  const taskId = session.task_id

  const { error } = await supabase
    .from('focus_sessions')
    .delete()
    .eq('id', validated.data.session_id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Recalculate task's actual_hours
  await recalculateTaskActualHours(supabase, taskId)

  // Invalidate AI context cache since focus session deleted
  await invalidateCache(user.id)

  revalidateFocusPaths()
  return { success: true }
}
