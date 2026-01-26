import { z } from 'zod'

// Task validation schemas
export const taskStatusSchema = z.enum(['inbox', 'today', 'next', 'waiting', 'blocked', 'someday', 'done'])
export const taskPrioritySchema = z.enum(['1', '2', '3', '4'])
export const energyLevelSchema = z.enum(['low', 'medium', 'high'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  notes: z.string().max(5000, 'Notes too long').optional().nullable(),
  project_id: z.string().uuid('Invalid project'),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimate_hours: z.number().min(0).max(1000).optional().nullable(),
  status: taskStatusSchema.optional().default('inbox'),
  priority: taskPrioritySchema.optional().default('3'),
  energy_level: energyLevelSchema.optional().nullable(),
  blocked_by: z.string().uuid('Invalid task reference').optional().nullable(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(5000).optional().nullable(),
  project_id: z.string().uuid().optional(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimate_hours: z.number().min(0).max(1000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  energy_level: energyLevelSchema.optional().nullable(),
  blocked_by: z.string().uuid().optional().nullable(),
})

export const completeTaskSchema = z.object({
  actual_hours: z.number().min(0).max(1000).optional().nullable(),
  outcome_note: z.string().max(1000).optional().nullable(),
})

// Project validation schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional(),
  icon: z.string().max(10).optional().nullable(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional().nullable(),
  is_archived: z.boolean().optional(),
})

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Focus session validation schemas
export const createFocusSessionSchema = z.object({
  task_id: z.string().uuid('Invalid task'),
})

export const endFocusSessionSchema = z.object({
  session_id: z.string().uuid('Invalid session'),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
})

export const updateFocusSessionSchema = z.object({
  session_id: z.string().uuid('Invalid session'),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours').optional(),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
})

export const createManualFocusSessionSchema = z.object({
  task_id: z.string().uuid('Invalid task'),
  started_at: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours'),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
})

export const deleteFocusSessionSchema = z.object({
  session_id: z.string().uuid('Invalid session'),
})

// Brain dump validation schemas
export const parseBrainDumpSchema = z.object({
  input: z.string().min(10, 'Enter at least 10 characters').max(10000, 'Input too long'),
  default_project_id: z.string().uuid('Invalid project'),
})

export const confirmBrainDumpSchema = z.object({
  session_id: z.string().uuid('Invalid session'),
  tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    notes: z.string().max(5000).optional().nullable(),
    project_id: z.string().uuid(),
    start_date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    estimate_hours: z.number().min(0).max(1000).optional().nullable(),
    priority: taskPrioritySchema.optional(),
    energy_level: energyLevelSchema.optional().nullable(),
  })),
})

// Type exports
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type CreateFocusSessionInput = z.infer<typeof createFocusSessionSchema>
export type EndFocusSessionInput = z.infer<typeof endFocusSessionSchema>
export type UpdateFocusSessionInput = z.infer<typeof updateFocusSessionSchema>
export type CreateManualFocusSessionInput = z.infer<typeof createManualFocusSessionSchema>
export type DeleteFocusSessionInput = z.infer<typeof deleteFocusSessionSchema>
export type ParseBrainDumpInput = z.infer<typeof parseBrainDumpSchema>
export type ConfirmBrainDumpInput = z.infer<typeof confirmBrainDumpSchema>
