'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendMessage, generateReportContent } from '@/lib/ai/assistant'
import { buildContext } from '@/lib/ai/context/builder'
import {
  sendAssistantMessageSchema,
  generateReportSchema,
  type SendAssistantMessageInput,
  type GenerateReportInput
} from '@/lib/validations'
import type { AIModel, AIMessage, AIConversation, AIReport, AIProposedAction } from '@/types/ai'

/**
 * Send a message to the AI assistant and get a response.
 * Creates a new conversation if conversation_id is not provided.
 */
export async function sendAssistantMessage(input: SendAssistantMessageInput): Promise<{
  data?: {
    conversation_id: string
    message: AIMessage
    proposed_actions?: AIProposedAction[]
  }
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = sendAssistantMessageSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { conversation_id, message, model } = validated.data

  // Get or create conversation
  let conversationId: string = conversation_id || ''
  let selectedModel: AIModel = model || 'claude-opus-4-20250514'

  if (!conversation_id) {
    // Get user's default model preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_preferences')
      .eq('id', user.id)
      .single()

    if (profile?.ai_preferences?.default_model && !model) {
      selectedModel = profile.ai_preferences.default_model
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        model: selectedModel,
        is_saved: false,
      })
      .select()
      .single()

    if (convError) {
      return { error: convError.message }
    }
    conversationId = newConv.id
  } else {
    // Get existing conversation's model
    const { data: conv } = await supabase
      .from('ai_conversations')
      .select('model')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (conv) {
      selectedModel = model || conv.model
    }
  }

  // Save user message
  const { error: msgError } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

  if (msgError) {
    return { error: msgError.message }
  }

  // Build context
  const context = await buildContext(conversationId)

  // Get conversation history
  const { data: history } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(50)

  // Send to AI
  const response = await sendMessage({
    message,
    context,
    history: history || [],
    model: selectedModel,
    userId: user.id,
    conversationId: conversationId,
  })

  if (response.error) {
    return { error: response.error }
  }

  // Save assistant message
  const { data: assistantMessage, error: assistantError } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: response.content,
      model: selectedModel,
      tokens_used: response.tokensUsed,
      metadata: {
        data_references: response.dataReferences,
      },
    })
    .select()
    .single()

  if (assistantError) {
    return { error: assistantError.message }
  }

  // If there are proposed actions, save them
  const savedActions: AIProposedAction[] = []
  if (response.proposedActions && response.proposedActions.length > 0) {
    for (const action of response.proposedActions) {
      const { data: savedAction, error: actionError } = await supabase
        .from('ai_proposed_actions')
        .insert({
          conversation_id: conversationId,
          message_id: assistantMessage.id,
          user_id: user.id,
          action_type: action.type,
          target_task_id: action.taskId || null,
          target_project_id: action.projectId || null,
          proposed_data: action.proposedData,
          original_data: action.originalData || null,
        })
        .select()
        .single()

      if (!actionError && savedAction) {
        savedActions.push(savedAction as AIProposedAction)
      }
    }
  }

  // Update conversation title if this is the first exchange
  const { data: messageCount } = await supabase
    .from('ai_messages')
    .select('id')
    .eq('conversation_id', conversationId)

  if (messageCount && messageCount.length <= 2) {
    // Generate title from first message
    const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
    await supabase
      .from('ai_conversations')
      .update({ title })
      .eq('id', conversationId)
  }

  revalidatePath('/inbox')
  revalidatePath('/today')

  return {
    data: {
      conversation_id: conversationId,
      message: assistantMessage as AIMessage,
      proposed_actions: savedActions.length > 0 ? savedActions : undefined,
    }
  }
}

/**
 * Generate a standardized report on demand.
 */
export async function generateReport(input: GenerateReportInput): Promise<{
  data?: AIReport
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const validated = generateReportSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { report_type, parameters } = validated.data

  // Check for cached report (valid for 1 hour for daily, 6 hours for weekly)
  const cacheHours = report_type === 'daily_briefing' ? 1 : 6
  const cacheThreshold = new Date(Date.now() - cacheHours * 60 * 60 * 1000).toISOString()

  const { data: cached } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('user_id', user.id)
    .eq('report_type', report_type)
    .gte('created_at', cacheThreshold)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (cached) {
    return { data: cached as AIReport }
  }

  // Build context and generate report
  const context = await buildContext()

  const report = await generateReportContent({
    reportType: report_type,
    context,
    parameters: parameters || {},
    userId: user.id,
  })

  if (report.error) {
    return { error: report.error }
  }

  // Save report
  const { data: savedReport, error: saveError } = await supabase
    .from('ai_reports')
    .insert({
      user_id: user.id,
      report_type: report_type,
      parameters: parameters || {},
      content: report.content,
      data_snapshot: report.dataSnapshot,
      valid_until: new Date(Date.now() + cacheHours * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (saveError) {
    return { error: saveError.message }
  }

  return { data: savedReport as AIReport }
}

/**
 * Get conversations for the current user.
 */
export async function getConversations(options?: {
  limit?: number
  includeArchived?: boolean
}): Promise<{ data?: AIConversation[]; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  let query = supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_saved', true)

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false)
  }

  query = query
    .order('updated_at', { ascending: false })
    .limit(options?.limit || 50)

  const { data, error } = await query

  if (error) {
    return { error: error.message }
  }

  return { data: data as AIConversation[] }
}

/**
 * Get messages for a conversation.
 */
export async function getConversationMessages(conversationId: string): Promise<{
  data?: AIMessage[]
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: conv } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!conv) {
    return { error: 'Conversation not found' }
  }

  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data: data as AIMessage[] }
}

/**
 * Update a conversation (title, save status, archive).
 */
export async function updateConversation(
  conversationId: string,
  updates: { title?: string; is_saved?: boolean; is_archived?: boolean }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('ai_conversations')
    .update(updates)
    .eq('id', conversationId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Delete a conversation and its messages.
 */
export async function deleteConversation(conversationId: string): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Cascade delete will handle messages and proposed actions
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
