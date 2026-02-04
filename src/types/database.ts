// Database types - manually defined for V1
// In production, generate with: supabase gen types typescript --local

export type TaskStatus = 'inbox' | 'today' | 'next' | 'waiting' | 'blocked' | 'someday' | 'done'
export type TaskPriority = '1' | '2' | '3' | '4'
export type EnergyLevel = 'low' | 'medium' | 'high'
export type ActivityAction = 'create' | 'update' | 'move' | 'complete' | 'reopen' | 'delete'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  timezone: string  // IANA timezone identifier (e.g., 'America/Los_Angeles')
  ai_instructions: string | null  // V3: User-provided context for AI assistant
  ai_preferences: AIPreferencesJson | null  // V3: AI assistant preferences
  created_at: string
  updated_at: string
}

// AI Preferences stored as JSONB
export interface AIPreferencesJson {
  default_model: 'claude-opus-4-20250514' | 'claude-sonnet-4-20250514'
  auto_save_conversations: boolean
  conversation_retention_days: number
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
  energy_level: EnergyLevel | null
  blocked_by: string | null
  brain_dump_id: string | null
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

// V1.5 Types
export interface FocusSession {
  id: string
  user_id: string
  task_id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

export interface BrainDumpSession {
  id: string
  user_id: string
  default_project_id: string | null
  raw_input: string
  parsed_count: number
  created_at: string
}

// Joined types
export interface TaskWithProject extends Task {
  project: Project
}

export interface TaskWithBlocker extends Task {
  blocking_task?: Task | null
}

// Insert/Update types
export type InsertTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type UpdateTask = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type InsertProject = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type UpdateProject = Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_system'>>

export type InsertActivityLog = Omit<ActivityLog, 'id' | 'created_at'>
