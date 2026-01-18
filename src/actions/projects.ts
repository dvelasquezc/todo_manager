'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations'
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validations'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function createProject(input: CreateProjectInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = createProjectSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const { name, description, color, icon } = validated.data
  const baseSlug = slugify(name)

  // Check for existing slug and generate unique one
  const { data: existing } = await supabase
    .from('projects')
    .select('slug')
    .eq('user_id', user.id)
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    const existingSlugs = new Set(existing.map(p => p.slug))
    let counter = 1
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from('projects')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = (maxOrder?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name,
      slug,
      description: description || null,
      color: color || '#6366f1',
      icon: icon || null,
      is_system: false,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { data }
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = updateProjectSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const { data, error } = await supabase
    .from('projects')
    .update(validated.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { data }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if it's a system project
  const { data: project } = await supabase
    .from('projects')
    .select('is_system')
    .eq('id', id)
    .single()

  if (project?.is_system) {
    return { error: 'Cannot delete system projects' }
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function archiveProject(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('projects')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_system', false)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { data }
}

export async function getProjects() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order')

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getProjectBySlug(slug: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}
