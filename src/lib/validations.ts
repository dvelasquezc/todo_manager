import { z } from 'zod'

// Task validation schemas
export const taskStatusSchema = z.enum(['inbox', 'today', 'next', 'waiting', 'blocked', 'someday', 'done'])
export const taskPrioritySchema = z.enum(['1', '2', '3', '4'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  notes: z.string().max(5000, 'Notes too long').optional().nullable(),
  project_id: z.string().uuid('Invalid project'),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimate_hours: z.number().min(0).max(1000).optional().nullable(),
  status: taskStatusSchema.optional().default('inbox'),
  priority: taskPrioritySchema.optional().default('3'),
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

// Type exports
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
