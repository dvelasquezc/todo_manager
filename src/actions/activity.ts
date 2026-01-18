'use server'

import { createClient } from '@/lib/supabase/server'

export async function getActivityLogs(filter?: {
  taskId?: string
  projectId?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  let query = supabase
    .from('activity_logs')
    .select('*, task:tasks(title), project:projects(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filter?.taskId) {
    query = query.eq('task_id', filter.taskId)
  }
  if (filter?.projectId) {
    query = query.eq('project_id', filter.projectId)
  }
  if (filter?.startDate) {
    query = query.gte('created_at', filter.startDate)
  }
  if (filter?.endDate) {
    query = query.lte('created_at', filter.endDate)
  }
  if (filter?.limit) {
    query = query.limit(filter.limit)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getTaskHistory(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}
