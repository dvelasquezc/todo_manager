// Database types - manually defined for V1
// In production, generate with: supabase gen types typescript --local

export type TaskStatus = 'inbox' | 'today' | 'next' | 'waiting' | 'blocked' | 'someday' | 'done'
export type TaskPriority = '1' | '2' | '3' | '4'
export type ActivityAction = 'create' | 'update' | 'move' | 'complete' | 'reopen' | 'delete'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  slug: string
  description: string | null
  color: string
  icon: string | null
  is_system: boolean
  is_archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id: string
  title: string
  notes: string | null
  start_date: string | null
  due_date: string | null
  estimate_hours: number | null
  actual_hours: number | null
  status: TaskStatus
  priority: TaskPriority
  completed_at: string | null
  outcome_note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  action: ActivityAction
  changes: Record<string, { old: unknown; new: unknown }> | null
  actor: string
  reason: string | null
  created_at: string
}

// Joined types
export interface TaskWithProject extends Task {
  project: Project
}

// Insert/Update types
export type InsertTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type UpdateTask = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type InsertProject = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type UpdateProject = Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_system'>>

export type InsertActivityLog = Omit<ActivityLog, 'id' | 'created_at'>
