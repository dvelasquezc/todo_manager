'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  updateAIInstructionsSchema,
  updateAIPreferencesSchema,
  type UpdateAIInstructionsInput,
  type UpdateAIPreferencesInput
} from '@/lib/validations'
import type { Profile, AIPreferencesJson } from '@/types/database'

/**
 * Get the current user's profile.
 */
export async function getProfile(): Promise<{
  data?: Profile
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data: data as Profile }
}

/**
 * Update the user's AI instructions.
 * These instructions provide persistent context to the AI assistant.
 */
export async function updateAIInstructions(input: UpdateAIInstructionsInput): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = updateAIInstructionsSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ai_instructions: validated.data.instructions })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')

  return { success: true }
}

/**
 * Update the user's AI preferences.
 */
export async function updateAIPreferences(input: UpdateAIPreferencesInput): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = updateAIPreferencesSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Get existing preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_preferences')
    .eq('id', user.id)
    .single()

  const existingPrefs: AIPreferencesJson = profile?.ai_preferences || {
    default_model: 'claude-opus-4-20250514',
    auto_save_conversations: false,
    conversation_retention_days: 30,
  }

  // Merge with new preferences
  const newPrefs: AIPreferencesJson = {
    ...existingPrefs,
    ...validated.data,
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ai_preferences: newPrefs })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')

  return { success: true }
}

/**
 * Update the user's timezone.
 */
export async function updateTimezone(timezone: string): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
  } catch {
    return { error: 'Invalid timezone' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ timezone })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')

  return { success: true }
}

/**
 * Update the user's display name.
 */
export async function updateDisplayName(displayName: string | null): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  if (displayName && displayName.length > 100) {
    return { error: 'Display name too long' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')

  return { success: true }
}
