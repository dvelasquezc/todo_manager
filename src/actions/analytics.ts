'use server'

import { createClient } from '@/lib/supabase/server'
import type { TaskStatus, Project } from '@/types/database'

// Types for analytics data

export interface WeeklyStats {
  totalHours: number
  tasksCompleted: number
  wipCount: number
  avgCycleTimeDays: number | null
}

export interface HoursByProjectWeek {
  week: string
  projectId: string
  projectName: string
  projectColor: string
  minutes: number
}

export interface DeepWorkWeek {
  week: string
  deepMinutes: number
  totalMinutes: number
  deepWorkPercent: number
}

export interface ContextSwitchingDay {
  day: string
  projectCount: number
}

export interface PlannedVsActualWeek {
  week: string
  estimated: number
  actual: number
}

export interface EstimateCalibrationPoint {
  id: string
  title: string
  estimateHours: number
  actualHours: number
  projectId: string
  projectColor: string
}

export interface TaskThroughputWeek {
  week: string
  projectId: string
  projectName: string
  projectColor: string
  completed: number
}

export interface StatusFlowWeek {
  week: string
  inbox: number
  today: number
  next: number
  waiting: number
  blocked: number
  someday: number
}

export interface WipAgingData {
  status: TaskStatus
  count: number
  aging7d: number
  aging14d: number
  aging30d: number
}

export interface CycleTimeByProject {
  projectId: string
  projectName: string
  projectColor: string
  avgDays: number
  taskCount: number
}

export interface FrictionAlert {
  type: 'stuck_today' | 'overdue' | 'high_churn' | 'stale'
  taskId: string
  taskTitle: string
  projectName: string
  projectColor: string
  detail: string
}

// Helper to get start of week (Sunday) for aggregation
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to format date as ISO week string
function formatWeek(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper to get day of week (1=Mon to 7=Sun) from a date string like "2026-01-21"
// Uses UTC date parsing to avoid timezone issues
function getDayOfWeekFromDateString(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Create date at noon UTC to avoid any timezone edge cases
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const jsDay = date.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  // Convert to ISO week format (1=Mon to 7=Sun)
  return jsDay === 0 ? 7 : jsDay
}

// Helper to calculate start date for analytics queries
// weeks=0 means "all time" (no date filter)
// weeks=1 means "this calendar week" (starts Monday), other values mean "last N*7 days"
function getAnalyticsStartDate(weeks: number): Date | null {
  if (weeks === 0) return null  // All time - no date filter

  const now = new Date()

  if (weeks === 1) {
    // Get start of current calendar week (Monday)
    const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysFromMonday)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  // For other values, use last N*7 days
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (weeks * 7))
  return startDate
}

// Get weekly stats for the top metrics cards
export async function getWeeklyStats(): Promise<{ data: WeeklyStats | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get start of this week
  const weekStart = getWeekStart(new Date())
  const weekStartISO = weekStart.toISOString()

  // Get hours this week from focus sessions
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('duration_minutes')
    .eq('user_id', user.id)
    .gte('started_at', weekStartISO)
    .not('ended_at', 'is', null)

  const totalMinutes = sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  // Get tasks completed this week
  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .gte('completed_at', weekStartISO)

  const tasksCompleted = completedTasks?.length || 0

  // Get WIP count (tasks not in inbox, someday, or done)
  const { data: wipTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['today', 'next', 'waiting', 'blocked'])

  const wipCount = wipTasks?.length || 0

  // Get average cycle time for tasks completed this week
  const { data: cycleData } = await supabase
    .from('tasks')
    .select('created_at, completed_at')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .not('completed_at', 'is', null)
    .gte('completed_at', weekStartISO)

  let avgCycleTimeDays: number | null = null
  if (cycleData && cycleData.length > 0) {
    const cycleTimes = cycleData.map(t => {
      const created = new Date(t.created_at).getTime()
      const completed = new Date(t.completed_at!).getTime()
      return (completed - created) / (1000 * 60 * 60 * 24)
    })
    avgCycleTimeDays = Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length * 10) / 10
  }

  return {
    data: {
      totalHours,
      tasksCompleted,
      wipCount,
      avgCycleTimeDays,
    },
    error: null,
  }
}

// Get hours by project per week (for stacked bar chart)
export async function getHoursByProjectWeekly(weeks: number = 8, projectIds?: string[]): Promise<{ data: HoursByProjectWeek[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Calculate start date (N weeks ago), null for all time
  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get projects for color mapping
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', user.id)

  const projectMap = new Map(projects?.map(p => [p.id, { name: p.name, color: p.color }]) || [])

  // Get focus sessions with task info
  let sessionsQuery = supabase
    .from('focus_sessions')
    .select('started_at, duration_minutes, task:tasks(project_id)')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)

  if (startDateISO) {
    sessionsQuery = sessionsQuery.gte('started_at', startDateISO)
  }

  const { data: sessions } = await sessionsQuery

  if (!sessions) {
    return { data: [], error: null }
  }

  // Aggregate by week and project
  const weeklyData = new Map<string, Map<string, number>>()

  for (const session of sessions) {
    const taskData = session.task as unknown as { project_id: string } | null
    const projectId = taskData?.project_id
    if (!projectId) continue
    // Filter by selected projects if provided
    if (projectIds && projectIds.length > 0 && !projectIds.includes(projectId)) continue

    const weekStart = getWeekStart(new Date(session.started_at))
    const weekKey = formatWeek(weekStart)

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, new Map())
    }
    const projectData = weeklyData.get(weekKey)!
    const current = projectData.get(projectId) || 0
    projectData.set(projectId, current + (session.duration_minutes || 0))
  }

  // Convert to array
  const result: HoursByProjectWeek[] = []
  for (const [week, projectData] of weeklyData) {
    for (const [projectId, minutes] of projectData) {
      const project = projectMap.get(projectId)
      result.push({
        week,
        projectId,
        projectName: project?.name || 'Unknown',
        projectColor: project?.color || '#888888',
        minutes,
      })
    }
  }

  // Sort by week
  result.sort((a, b) => a.week.localeCompare(b.week))

  return { data: result, error: null }
}

// Get deep work share over time (high energy tasks)
export async function getDeepWorkTrend(weeks: number = 8, projectIds?: string[]): Promise<{ data: DeepWorkWeek[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get focus sessions with task energy level and project
  let sessionsQuery = supabase
    .from('focus_sessions')
    .select('started_at, duration_minutes, task:tasks(energy_level, project_id)')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)

  if (startDateISO) {
    sessionsQuery = sessionsQuery.gte('started_at', startDateISO)
  }

  const { data: sessions } = await sessionsQuery

  if (!sessions) {
    return { data: [], error: null }
  }

  // Aggregate by week
  const weeklyData = new Map<string, { deep: number; total: number }>()

  for (const session of sessions) {
    const taskData = session.task as unknown as { energy_level: string | null; project_id: string } | null
    const projectId = taskData?.project_id
    // Filter by selected projects if provided
    if (projectIds && projectIds.length > 0 && projectId && !projectIds.includes(projectId)) continue

    const weekStart = getWeekStart(new Date(session.started_at))
    const weekKey = formatWeek(weekStart)
    const energyLevel = taskData?.energy_level

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { deep: 0, total: 0 })
    }
    const data = weeklyData.get(weekKey)!
    const minutes = session.duration_minutes || 0
    data.total += minutes
    if (energyLevel === 'high') {
      data.deep += minutes
    }
  }

  // Convert to array
  const result: DeepWorkWeek[] = []
  for (const [week, data] of weeklyData) {
    result.push({
      week,
      deepMinutes: data.deep,
      totalMinutes: data.total,
      deepWorkPercent: data.total > 0 ? Math.round(data.deep / data.total * 100) : 0,
    })
  }

  result.sort((a, b) => a.week.localeCompare(b.week))

  return { data: result, error: null }
}

// Get context switching index (distinct projects per day)
export async function getContextSwitchingTrend(weeks: number = 4, projectIds?: string[]): Promise<{ data: ContextSwitchingDay[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get focus sessions with task project
  let sessionsQuery = supabase
    .from('focus_sessions')
    .select('started_at, task:tasks(project_id)')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)

  if (startDateISO) {
    sessionsQuery = sessionsQuery.gte('started_at', startDateISO)
  }

  const { data: sessions } = await sessionsQuery

  if (!sessions) {
    return { data: [], error: null }
  }

  // Aggregate by day
  const dailyData = new Map<string, Set<string>>()

  for (const session of sessions) {
    const taskData = session.task as unknown as { project_id: string } | null
    const projectId = taskData?.project_id
    if (!projectId) continue
    // Filter by selected projects if provided
    if (projectIds && projectIds.length > 0 && !projectIds.includes(projectId)) continue

    const day = new Date(session.started_at).toISOString().split('T')[0]

    if (!dailyData.has(day)) {
      dailyData.set(day, new Set())
    }
    dailyData.get(day)!.add(projectId)
  }

  // Convert to array
  const result: ContextSwitchingDay[] = []
  for (const [day, projects] of dailyData) {
    result.push({
      day,
      projectCount: projects.size,
    })
  }

  result.sort((a, b) => a.day.localeCompare(b.day))

  return { data: result, error: null }
}

// Get planned vs actual time comparison
export async function getPlannedVsActualTrend(weeks: number = 8, projectIds?: string[]): Promise<{ data: PlannedVsActualWeek[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get completed tasks with both estimate and actual hours
  let tasksQuery = supabase
    .from('tasks')
    .select('completed_at, estimate_hours, actual_hours, project_id')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .not('completed_at', 'is', null)
    .not('estimate_hours', 'is', null)
    .not('actual_hours', 'is', null)

  if (startDateISO) {
    tasksQuery = tasksQuery.gte('completed_at', startDateISO)
  }

  if (projectIds && projectIds.length > 0) {
    tasksQuery = tasksQuery.in('project_id', projectIds)
  }

  const { data: tasks } = await tasksQuery

  if (!tasks) {
    return { data: [], error: null }
  }

  // Aggregate by week
  const weeklyData = new Map<string, { estimated: number; actual: number }>()

  for (const task of tasks) {
    const weekStart = getWeekStart(new Date(task.completed_at!))
    const weekKey = formatWeek(weekStart)

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { estimated: 0, actual: 0 })
    }
    const data = weeklyData.get(weekKey)!
    data.estimated += task.estimate_hours || 0
    data.actual += task.actual_hours || 0
  }

  // Convert to array
  const result: PlannedVsActualWeek[] = []
  for (const [week, data] of weeklyData) {
    result.push({
      week,
      estimated: Math.round(data.estimated * 10) / 10,
      actual: Math.round(data.actual * 10) / 10,
    })
  }

  result.sort((a, b) => a.week.localeCompare(b.week))

  return { data: result, error: null }
}

// Get estimate calibration data (scatter plot)
export async function getEstimateCalibration(weeks?: number, projectIds?: string[]): Promise<{ data: EstimateCalibrationPoint[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get projects for color mapping
  const { data: projects } = await supabase
    .from('projects')
    .select('id, color')
    .eq('user_id', user.id)

  const projectColorMap = new Map(projects?.map(p => [p.id, p.color]) || [])

  // Get completed tasks with both estimate and actual hours
  let query = supabase
    .from('tasks')
    .select('id, title, estimate_hours, actual_hours, project_id, completed_at')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .not('estimate_hours', 'is', null)
    .not('actual_hours', 'is', null)
    .gt('actual_hours', 0)

  // Apply time filter if provided (weeks=0 means all time, skip filter)
  if (weeks && weeks > 0) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeks * 7))
    query = query.gte('completed_at', startDate.toISOString())
  }

  // Apply project filter if provided
  if (projectIds && projectIds.length > 0) {
    query = query.in('project_id', projectIds)
  }

  const { data: tasks } = await query
    .order('completed_at', { ascending: false })
    .limit(100)

  if (!tasks) {
    return { data: [], error: null }
  }

  const result: EstimateCalibrationPoint[] = tasks.map(t => ({
    id: t.id,
    title: t.title,
    estimateHours: t.estimate_hours!,
    actualHours: t.actual_hours!,
    projectId: t.project_id,
    projectColor: projectColorMap.get(t.project_id) || '#888888',
  }))

  return { data: result, error: null }
}

// Get task throughput per week
export async function getTaskThroughputTrend(weeks: number = 8, projectIds?: string[]): Promise<{ data: TaskThroughputWeek[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get projects for name/color mapping
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', user.id)

  const projectMap = new Map(projects?.map(p => [p.id, { name: p.name, color: p.color }]) || [])

  // Get completed tasks
  let tasksQuery = supabase
    .from('tasks')
    .select('completed_at, project_id')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .not('completed_at', 'is', null)

  if (startDateISO) {
    tasksQuery = tasksQuery.gte('completed_at', startDateISO)
  }

  if (projectIds && projectIds.length > 0) {
    tasksQuery = tasksQuery.in('project_id', projectIds)
  }

  const { data: tasks } = await tasksQuery

  if (!tasks) {
    return { data: [], error: null }
  }

  // Aggregate by week and project
  const weeklyData = new Map<string, Map<string, number>>()

  for (const task of tasks) {
    const weekStart = getWeekStart(new Date(task.completed_at!))
    const weekKey = formatWeek(weekStart)

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, new Map())
    }
    const projectData = weeklyData.get(weekKey)!
    const current = projectData.get(task.project_id) || 0
    projectData.set(task.project_id, current + 1)
  }

  // Convert to array
  const result: TaskThroughputWeek[] = []
  for (const [week, projectData] of weeklyData) {
    for (const [projectId, completed] of projectData) {
      const project = projectMap.get(projectId)
      result.push({
        week,
        projectId,
        projectName: project?.name || 'Unknown',
        projectColor: project?.color || '#888888',
        completed,
      })
    }
  }

  result.sort((a, b) => a.week.localeCompare(b.week))

  return { data: result, error: null }
}

// Get status flow over time (current snapshot by creation week)
export async function getStatusFlowTrend(weeks: number = 8, projectIds?: string[]): Promise<{ data: StatusFlowWeek[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get all non-done tasks created in the period
  let tasksQuery = supabase
    .from('tasks')
    .select('created_at, status, project_id')
    .eq('user_id', user.id)
    .neq('status', 'done')

  if (startDateISO) {
    tasksQuery = tasksQuery.gte('created_at', startDateISO)
  }

  if (projectIds && projectIds.length > 0) {
    tasksQuery = tasksQuery.in('project_id', projectIds)
  }

  const { data: tasks } = await tasksQuery

  if (!tasks) {
    return { data: [], error: null }
  }

  // Aggregate by week and status
  const weeklyData = new Map<string, Record<TaskStatus, number>>()
  const defaultCounts = (): Record<TaskStatus, number> => ({
    inbox: 0,
    today: 0,
    next: 0,
    waiting: 0,
    blocked: 0,
    someday: 0,
    done: 0,
  })

  for (const task of tasks) {
    const weekStart = getWeekStart(new Date(task.created_at))
    const weekKey = formatWeek(weekStart)

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, defaultCounts())
    }
    const status = task.status as TaskStatus
    weeklyData.get(weekKey)![status]++
  }

  // Convert to array
  const result: StatusFlowWeek[] = []
  for (const [week, counts] of weeklyData) {
    result.push({
      week,
      inbox: counts.inbox,
      today: counts.today,
      next: counts.next,
      waiting: counts.waiting,
      blocked: counts.blocked,
      someday: counts.someday,
    })
  }

  result.sort((a, b) => a.week.localeCompare(b.week))

  return { data: result, error: null }
}

// Get WIP + aging data
export async function getWipAgingData(): Promise<{ data: WipAgingData[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const now = new Date()
  const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const days14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Get all non-done tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status, updated_at')
    .eq('user_id', user.id)
    .neq('status', 'done')

  if (!tasks) {
    return { data: [], error: null }
  }

  // Aggregate by status
  const statusData = new Map<TaskStatus, WipAgingData>()
  const statuses: TaskStatus[] = ['inbox', 'today', 'next', 'waiting', 'blocked', 'someday']

  for (const status of statuses) {
    statusData.set(status, {
      status,
      count: 0,
      aging7d: 0,
      aging14d: 0,
      aging30d: 0,
    })
  }

  for (const task of tasks) {
    const data = statusData.get(task.status)
    if (!data) continue

    data.count++
    if (task.updated_at < days7Ago) data.aging7d++
    if (task.updated_at < days14Ago) data.aging14d++
    if (task.updated_at < days30Ago) data.aging30d++
  }

  const result = Array.from(statusData.values()).filter(d => d.count > 0)

  return { data: result, error: null }
}

// Get cycle time by project
export async function getCycleTimeByProject(weeks?: number, projectIds?: string[]): Promise<{ data: CycleTimeByProject[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', user.id)

  const projectMap = new Map(projects?.map(p => [p.id, { name: p.name, color: p.color }]) || [])

  // Get completed tasks with completion timestamp
  let query = supabase
    .from('tasks')
    .select('project_id, created_at, completed_at')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .not('completed_at', 'is', null)

  // Apply time filter if provided (weeks=0 means all time, skip filter)
  if (weeks && weeks > 0) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeks * 7))
    query = query.gte('completed_at', startDate.toISOString())
  }

  // Apply project filter if provided
  if (projectIds && projectIds.length > 0) {
    query = query.in('project_id', projectIds)
  }

  const { data: tasks } = await query

  if (!tasks) {
    return { data: [], error: null }
  }

  // Calculate cycle times per project
  const projectCycleTimes = new Map<string, number[]>()

  for (const task of tasks) {
    const created = new Date(task.created_at).getTime()
    const completed = new Date(task.completed_at!).getTime()
    const cycleDays = (completed - created) / (1000 * 60 * 60 * 24)

    if (!projectCycleTimes.has(task.project_id)) {
      projectCycleTimes.set(task.project_id, [])
    }
    projectCycleTimes.get(task.project_id)!.push(cycleDays)
  }

  // Convert to result
  const result: CycleTimeByProject[] = []
  for (const [projectId, cycleTimes] of projectCycleTimes) {
    const project = projectMap.get(projectId)
    const avgDays = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length

    result.push({
      projectId,
      projectName: project?.name || 'Unknown',
      projectColor: project?.color || '#888888',
      avgDays: Math.round(avgDays * 10) / 10,
      taskCount: cycleTimes.length,
    })
  }

  // Sort by task count descending
  result.sort((a, b) => b.taskCount - a.taskCount)

  return { data: result, error: null }
}

// Get friction alerts
export async function getFrictionAlerts(): Promise<{ data: FrictionAlert[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const alerts: FrictionAlert[] = []
  const now = new Date()
  const days3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const today = now.toISOString().split('T')[0]

  // Get projects for name/color lookup
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', user.id)

  const projectMap = new Map(projects?.map(p => [p.id, { name: p.name, color: p.color }]) || [])

  // 1. Tasks stuck in "today" for 3+ days
  const { data: stuckTasks } = await supabase
    .from('tasks')
    .select('id, title, project_id, updated_at')
    .eq('user_id', user.id)
    .eq('status', 'today')
    .lt('updated_at', days3Ago)

  for (const task of stuckTasks || []) {
    const project = projectMap.get(task.project_id)
    const daysStuck = Math.floor((now.getTime() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      type: 'stuck_today',
      taskId: task.id,
      taskTitle: task.title,
      projectName: project?.name || 'Unknown',
      projectColor: project?.color || '#888888',
      detail: `Stuck in Today for ${daysStuck} days`,
    })
  }

  // 2. Overdue tasks
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, project_id, due_date')
    .eq('user_id', user.id)
    .neq('status', 'done')
    .lt('due_date', today)

  for (const task of overdueTasks || []) {
    const project = projectMap.get(task.project_id)
    const daysOverdue = Math.floor((now.getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      type: 'overdue',
      taskId: task.id,
      taskTitle: task.title,
      projectName: project?.name || 'Unknown',
      projectColor: project?.color || '#888888',
      detail: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
    })
  }

  // 3. High churn tasks (moved 3+ times) - from activity logs
  const { data: moveLogs } = await supabase
    .from('activity_logs')
    .select('task_id')
    .eq('user_id', user.id)
    .eq('action', 'move')

  // Count moves per task
  const moveCounts = new Map<string, number>()
  for (const log of moveLogs || []) {
    if (log.task_id) {
      moveCounts.set(log.task_id, (moveCounts.get(log.task_id) || 0) + 1)
    }
  }

  // Get task details for high churn tasks
  const highChurnIds = Array.from(moveCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([id]) => id)

  if (highChurnIds.length > 0) {
    const { data: highChurnTasks } = await supabase
      .from('tasks')
      .select('id, title, project_id, status')
      .in('id', highChurnIds)
      .neq('status', 'done')

    for (const task of highChurnTasks || []) {
      const project = projectMap.get(task.project_id)
      const moves = moveCounts.get(task.id) || 0
      alerts.push({
        type: 'high_churn',
        taskId: task.id,
        taskTitle: task.title,
        projectName: project?.name || 'Unknown',
        projectColor: project?.color || '#888888',
        detail: `Moved ${moves} times`,
      })
    }
  }

  // 4. Stale tasks (no activity for 7+ days, not in someday)
  const { data: staleTasks } = await supabase
    .from('tasks')
    .select('id, title, project_id, updated_at')
    .eq('user_id', user.id)
    .neq('status', 'done')
    .neq('status', 'someday')
    .lt('updated_at', days7Ago)
    .limit(10)

  for (const task of staleTasks || []) {
    const project = projectMap.get(task.project_id)
    const daysSinceUpdate = Math.floor((now.getTime() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    // Avoid duplicate with stuck_today
    if (!alerts.find(a => a.taskId === task.id)) {
      alerts.push({
        type: 'stale',
        taskId: task.id,
        taskTitle: task.title,
        projectName: project?.name || 'Unknown',
        projectColor: project?.color || '#888888',
        detail: `No activity for ${daysSinceUpdate} days`,
      })
    }
  }

  // Sort by type priority: overdue first, then stuck, then high_churn, then stale
  const typePriority: Record<FrictionAlert['type'], number> = {
    overdue: 1,
    stuck_today: 2,
    high_churn: 3,
    stale: 4,
  }
  alerts.sort((a, b) => typePriority[a.type] - typePriority[b.type])

  return { data: alerts, error: null }
}

// Types for daily productivity charts
export interface DailyCompletion {
  date: string  // "2026-01-15"
  completed: number
  hours: number  // hours from focus sessions
}

export interface DayOfWeekStats {
  day: string        // "Mon", "Tue", etc.
  dayIndex: number   // 1=Mon, 2=Tue, ..., 7=Sun (ISO week)
  avgHours: number   // Average hours worked
  avgTasks: number   // Average tasks completed
}

// Get daily task completion counts and hours worked
export async function getDailyTaskCompletion(weeks: number = 4, projectIds?: string[]): Promise<{ data: DailyCompletion[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get completed tasks
  let tasksQuery = supabase
    .from('tasks')
    .select('completed_at, project_id')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .not('completed_at', 'is', null)

  if (startDateISO) {
    tasksQuery = tasksQuery.gte('completed_at', startDateISO)
  }

  if (projectIds && projectIds.length > 0) {
    tasksQuery = tasksQuery.in('project_id', projectIds)
  }

  const { data: tasks } = await tasksQuery

  // Get focus sessions for hours worked
  let sessionsQuery = supabase
    .from('focus_sessions')
    .select('started_at, duration_minutes, task:tasks(project_id)')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)

  if (startDateISO) {
    sessionsQuery = sessionsQuery.gte('started_at', startDateISO)
  }

  const { data: sessions } = await sessionsQuery

  // Aggregate tasks by date
  const dailyTasks = new Map<string, number>()
  for (const task of tasks || []) {
    const date = task.completed_at!.split('T')[0]
    dailyTasks.set(date, (dailyTasks.get(date) || 0) + 1)
  }

  // Aggregate hours by date (filter sessions by project if needed)
  const dailyMinutes = new Map<string, number>()
  for (const session of sessions || []) {
    const taskData = session.task as unknown as { project_id: string } | null
    const projectId = taskData?.project_id
    // Filter by selected projects if provided
    if (projectIds && projectIds.length > 0 && projectId && !projectIds.includes(projectId)) continue

    const date = session.started_at.split('T')[0]
    dailyMinutes.set(date, (dailyMinutes.get(date) || 0) + (session.duration_minutes || 0))
  }

  // Combine all dates from both sources
  const allDates = new Set([...dailyTasks.keys(), ...dailyMinutes.keys()])

  // Convert to array and sort
  const result: DailyCompletion[] = Array.from(allDates)
    .map(date => ({
      date,
      completed: dailyTasks.get(date) || 0,
      hours: Math.round((dailyMinutes.get(date) || 0) / 60 * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { data: result, error: null }
}

// Get productivity patterns by day of week
export async function getProductivityByDayOfWeek(weeks: number = 8, projectIds?: string[]): Promise<{ data: DayOfWeekStats[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const startDate = getAnalyticsStartDate(weeks)
  const startDateISO = startDate?.toISOString()

  // Get focus sessions for hours worked
  let sessionsQuery = supabase
    .from('focus_sessions')
    .select('started_at, duration_minutes, task:tasks(project_id)')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)

  if (startDateISO) {
    sessionsQuery = sessionsQuery.gte('started_at', startDateISO)
  }

  const { data: sessions } = await sessionsQuery

  // Get completed tasks
  let tasksQuery = supabase
    .from('tasks')
    .select('completed_at, project_id')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .not('completed_at', 'is', null)

  if (startDateISO) {
    tasksQuery = tasksQuery.gte('completed_at', startDateISO)
  }

  if (projectIds && projectIds.length > 0) {
    tasksQuery = tasksQuery.in('project_id', projectIds)
  }

  const { data: tasks } = await tasksQuery

  // Initialize data for each day of week (1=Mon to 7=Sun)
  const dayData = new Map<number, { totalMinutes: number; totalTasks: number; daysCount: Set<string> }>()
  for (let i = 1; i <= 7; i++) {
    dayData.set(i, { totalMinutes: 0, totalTasks: 0, daysCount: new Set() })
  }

  // Aggregate focus sessions by day of week
  for (const session of sessions || []) {
    const taskData = session.task as unknown as { project_id: string } | null
    const projectId = taskData?.project_id
    // Filter by selected projects if provided
    if (projectIds && projectIds.length > 0 && projectId && !projectIds.includes(projectId)) continue

    // Extract UTC date and calculate day of week from it (consistent with daily chart)
    const dateKey = session.started_at.split('T')[0]
    const dayOfWeek = getDayOfWeekFromDateString(dateKey)

    const data = dayData.get(dayOfWeek)!
    data.totalMinutes += session.duration_minutes || 0
    data.daysCount.add(dateKey)
  }

  // Aggregate completed tasks by day of week
  for (const task of tasks || []) {
    // Extract UTC date and calculate day of week from it (consistent with daily chart)
    const dateKey = task.completed_at!.split('T')[0]
    const dayOfWeek = getDayOfWeekFromDateString(dateKey)

    const data = dayData.get(dayOfWeek)!
    data.totalTasks += 1
    data.daysCount.add(dateKey)
  }

  // Calculate averages
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const result: DayOfWeekStats[] = []

  for (let i = 1; i <= 7; i++) {
    const data = dayData.get(i)!
    const dayCount = data.daysCount.size || 1 // Avoid division by zero

    result.push({
      day: dayNames[i],
      dayIndex: i,
      avgHours: Math.round((data.totalMinutes / 60 / dayCount) * 10) / 10,
      avgTasks: Math.round((data.totalTasks / dayCount) * 10) / 10,
    })
  }

  return { data: result, error: null }
}

// Get all projects with colors (for legends)
export async function getProjectsForDashboard(): Promise<{ data: Pick<Project, 'id' | 'name' | 'color'>[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('sort_order')

  if (error) {
    return { error: error.message, data: null }
  }

  return { data: projects, error: null }
}
