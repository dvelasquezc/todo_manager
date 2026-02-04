// AI Assistant Types - V3.0

import type { TaskStatus, TaskPriority, EnergyLevel } from './database'

// Enums matching database
export type AIModel = 'claude-opus-4-20250514' | 'claude-sonnet-4-20250514'
export type MessageRole = 'user' | 'assistant' | 'system'
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type ActionType = 'create_task' | 'update_task' | 'move_task' | 'complete_task' | 'delete_task' | 'create_project'
export type ReportType = 'daily_briefing' | 'weekly_review' | 'long_term_trends' | 'friction_analysis' | 'estimate_calibration'

// Database table types
export interface AIConversation {
  id: string
  user_id: string
  title: string | null
  model: AIModel
  is_saved: boolean
  is_archived: boolean
  context_summary: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export interface AIMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  model: AIModel | null
  tokens_used: number | null
  metadata: AIMessageMetadata | null
  created_at: string
}

export interface AIMessageMetadata {
  tool_calls?: ToolCall[]
  proposed_action_ids?: string[]
  report_type?: ReportType
  data_references?: DataReference[]
}

export interface ToolCall {
  name: string
  input: Record<string, unknown>
  result?: unknown
}

export interface DataReference {
  type: 'task' | 'project' | 'friction_alert' | 'analytics'
  id: string
  label: string
}

export interface AIProposedAction {
  id: string
  conversation_id: string
  message_id: string
  user_id: string
  action_type: ActionType
  target_task_id: string | null
  target_project_id: string | null
  proposed_data: ProposedTaskData | ProposedProjectData
  original_data: Record<string, unknown> | null
  status: ActionStatus
  applied_at: string | null
  expires_at: string
  created_at: string
}

export interface ProposedTaskData {
  title?: string
  notes?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  start_date?: string | null
  due_date?: string | null
  estimate_hours?: number | null
  actual_hours?: number | null
  energy_level?: EnergyLevel | null
  project_id?: string
  blocked_by?: string | null
  outcome_note?: string | null
}

export interface ProposedProjectData {
  name?: string
  description?: string | null
  color?: string
}

export interface AIReport {
  id: string
  user_id: string
  report_type: ReportType
  parameters: Record<string, unknown> | null
  content: string
  data_snapshot: Record<string, unknown> | null
  valid_until: string | null
  created_at: string
}

export interface AIPreferences {
  default_model: AIModel
  auto_save_conversations: boolean
  conversation_retention_days: number
}

// Context types for building AI context
export interface AIContext {
  user_summary: UserSummary
  user_instructions: string | null
  current_tasks: TaskSummary[]
  recently_completed_tasks: CompletedTaskSummary[]
  friction_alerts: FrictionAlertSummary[]
  recent_activity: ActivitySummary[]
  analytics_snapshot: AnalyticsSnapshot
  conversation_history?: MessageSummary[]
}

export interface UserSummary {
  timezone: string
  total_tasks: number
  wip_count: number
  projects: ProjectSummary[]
}

export interface ProjectSummary {
  id: string
  name: string
  color: string
  task_count: number
}

export interface TaskSummary {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  project_id: string
  project_name: string
  due_date: string | null
  start_date: string | null
  estimate_hours: number | null
  actual_hours: number | null
  energy_level: EnergyLevel | null
  age_days: number
  days_in_status: number
}

export interface FrictionAlertSummary {
  type: 'stuck_today' | 'overdue' | 'high_churn' | 'stale'
  task_id: string
  task_title: string
  detail: string
}

export interface ActivitySummary {
  action: string
  task_title: string
  timestamp: string
}

export interface CompletedTaskSummary {
  id: string
  title: string
  project_name: string
  completed_at: string
  estimate_hours: number | null
  actual_hours: number | null
}

export interface AnalyticsSnapshot {
  weekly_hours: number
  tasks_completed_this_week: number
  avg_cycle_time_days: number | null
  deep_work_percent: number
  estimate_accuracy: number | null // ratio of actual/estimated
}

export interface MessageSummary {
  role: MessageRole
  content: string
  timestamp: string
}

// Server action input/output types
export interface SendMessageInput {
  conversation_id?: string
  message: string
  model?: AIModel
}

export interface SendMessageResult {
  conversation_id: string
  message: AIMessage
  proposed_actions?: AIProposedAction[]
}

export interface GenerateReportInput {
  report_type: ReportType
  parameters?: {
    weeks?: number
    project_ids?: string[]
  }
}

// AI Response types
export interface AIAssistantResponse {
  content: string
  tokensUsed: number
  proposedActions?: ProposedActionFromAI[]
  dataReferences?: DataReference[]
  error?: string
}

export interface ProposedActionFromAI {
  type: ActionType
  taskId?: string
  projectId?: string
  proposedData: ProposedTaskData | ProposedProjectData
  originalData?: Record<string, unknown>
  explanation: string
}

// Report content types
export interface ReportContent {
  content: string
  dataSnapshot: Record<string, unknown>
  error?: string
}

// UI State types
export interface AssistantPanelState {
  isOpen: boolean
  view: 'chat' | 'reports' | 'history'
  currentConversation: AIConversation | null
  selectedModel: AIModel
}

// Insert/Update types for database operations
export type InsertAIConversation = Omit<AIConversation, 'id' | 'created_at' | 'updated_at' | 'message_count'>
export type UpdateAIConversation = Partial<Pick<AIConversation, 'title' | 'is_saved' | 'is_archived' | 'context_summary' | 'model'>>

export type InsertAIMessage = Omit<AIMessage, 'id' | 'created_at'>
export type InsertAIProposedAction = Omit<AIProposedAction, 'id' | 'created_at' | 'applied_at'>
export type InsertAIReport = Omit<AIReport, 'id' | 'created_at'>
