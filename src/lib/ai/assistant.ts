import Anthropic from '@anthropic-ai/sdk'
import { buildAssistantSystemPrompt, buildReportPrompt, buildSummarizationPrompt } from './prompts/system-prompts'
import type {
  AIContext,
  AIModel,
  AIAssistantResponse,
  ProposedActionFromAI,
  ReportType,
  ReportContent,
  MessageSummary,
  DataReference
} from '@/types/ai'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface SendMessageParams {
  message: string
  context: AIContext
  history: { role: string; content: string }[]
  model: AIModel
  userId: string
  conversationId: string
}

/**
 * Send a message to the AI assistant and get a response.
 */
export async function sendMessage(params: SendMessageParams): Promise<AIAssistantResponse> {
  const { message, context, history, model } = params

  const systemPrompt = buildAssistantSystemPrompt(context)

  // Build conversation history for the API
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Add the new user message
  messages.push({
    role: 'user',
    content: message,
  })

  try {
    const response = await client.messages.create({
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
    })

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { content: '', tokensUsed: 0, error: 'No text response from AI' }
    }

    // Parse proposed actions from the response
    const proposedActions = parseProposedActions(textContent.text, context)

    return {
      content: textContent.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      proposedActions,
      dataReferences: extractDataReferences(textContent.text, context),
    }
  } catch (error) {
    console.error('AI Assistant error:', error)
    return {
      content: '',
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

interface GenerateReportParams {
  reportType: ReportType
  context: AIContext
  parameters: Record<string, unknown>
  userId: string
}

/**
 * Generate a standardized report.
 */
export async function generateReportContent(params: GenerateReportParams): Promise<ReportContent> {
  const { reportType, context, parameters } = params

  const systemPrompt = buildReportPrompt(reportType, context)

  // Build the user message based on report type
  const userMessage = buildReportUserMessage(reportType, parameters)

  try {
    // Use Opus for reports (better analysis quality)
    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { content: '', dataSnapshot: {}, error: 'No text response from AI' }
    }

    return {
      content: textContent.text,
      dataSnapshot: {
        analytics: context.analytics_snapshot,
        friction_alerts_count: context.friction_alerts.length,
        total_tasks: context.user_summary.total_tasks,
        wip_count: context.user_summary.wip_count,
        generated_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Report generation error:', error)
    return {
      content: '',
      dataSnapshot: {},
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Summarize a conversation for context management.
 */
export async function summarizeConversation(messages: MessageSummary[]): Promise<string> {
  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  try {
    // Use Sonnet for summarization (cost efficient)
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${buildSummarizationPrompt()}\n\nConversation:\n${conversationText}`,
        },
      ],
    })

    const textContent = response.content.find(block => block.type === 'text')
    return textContent?.type === 'text' ? textContent.text : ''
  } catch (error) {
    console.error('Summarization error:', error)
    return ''
  }
}

// Helper functions

function buildReportUserMessage(reportType: ReportType, parameters: Record<string, unknown>): string {
  const messages: Record<ReportType, string> = {
    daily_briefing: 'Please generate my Daily Briefing report for today.',
    weekly_review: 'Please generate my Weekly Review report.',
    long_term_trends: `Please generate a Long-term Trends analysis for the past ${parameters.weeks || 8} weeks.`,
    friction_analysis: 'Please generate a Friction Analysis report identifying issues in my workflow.',
    estimate_calibration: 'Please generate an Estimate Calibration report analyzing my time estimation accuracy.',
    today_success_rate: 'Please generate a "Today" Success Rate report analyzing how well I follow through on tasks I mark as "today".',
    productive_hours_map: 'Please generate a Productive Hours Map showing when I am most productive throughout the week.',
    procrastination_analysis: 'Please generate a Procrastination Analysis report identifying which tasks linger and why.',
  }

  return messages[reportType]
}

/**
 * Parse proposed actions from the AI response.
 * The AI is instructed to format proposals in a specific way.
 */
function parseProposedActions(responseText: string, context: AIContext): ProposedActionFromAI[] {
  const actions: ProposedActionFromAI[] = []

  // Look for **Proposed Action**: patterns in the response
  const actionPattern = /\*\*Proposed Action\*\*:\s*(\w+)\s*\n/gi
  const matches = [...responseText.matchAll(actionPattern)]

  for (const match of matches) {
    const actionType = match[1].toLowerCase()

    // Extract the block after this match
    const startIndex = match.index! + match[0].length
    const nextMatchIndex = responseText.indexOf('**Proposed Action**', startIndex)
    const blockEnd = nextMatchIndex > -1 ? nextMatchIndex : responseText.length
    const block = responseText.slice(startIndex, blockEnd)

    // Parse the block for task/change/reason
    const taskMatch = block.match(/[-*]\s*Task:\s*(.+)/i)
    const changeMatch = block.match(/[-*]\s*Change:\s*(.+)/i)
    const reasonMatch = block.match(/[-*]\s*Reason:\s*(.+)/i)

    if (taskMatch) {
      const taskTitle = taskMatch[1].trim()

      // Try to find matching task in context
      const existingTask = context.current_tasks.find(
        t => t.title.toLowerCase() === taskTitle.toLowerCase() ||
             t.title.toLowerCase().includes(taskTitle.toLowerCase()) ||
             taskTitle.toLowerCase().includes(t.title.toLowerCase())
      )

      // Determine action type
      let type: ProposedActionFromAI['type'] = 'update_task'
      if (actionType.includes('create') || actionType.includes('add')) {
        type = 'create_task'
      } else if (actionType.includes('move') || actionType.includes('status')) {
        type = 'move_task'
      } else if (actionType.includes('complete') || actionType.includes('done')) {
        type = 'complete_task'
      } else if (actionType.includes('delete') || actionType.includes('remove')) {
        type = 'delete_task'
      }

      // Parse proposed data from change description
      const proposedData = parseProposedData(changeMatch?.[1] || '', type, context)

      actions.push({
        type,
        taskId: existingTask?.id,
        projectId: existingTask?.project_id || context.user_summary.projects[0]?.id,
        proposedData,
        originalData: existingTask ? { status: existingTask.status, priority: existingTask.priority } : undefined,
        explanation: reasonMatch?.[1]?.trim() || 'AI suggestion',
      })
    }
  }

  return actions
}

/**
 * Parse proposed data from the change description.
 */
function parseProposedData(
  changeDescription: string,
  actionType: ProposedActionFromAI['type'],
  context: AIContext
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  const lower = changeDescription.toLowerCase()

  // Parse status changes
  const statuses = ['inbox', 'today', 'next', 'waiting', 'blocked', 'someday', 'done']
  for (const status of statuses) {
    if (lower.includes(`to ${status}`) || lower.includes(`→ ${status}`) || lower.includes(`move to ${status}`)) {
      data.status = status
    }
  }

  // Parse priority changes
  const priorityMatch = changeDescription.match(/priority\s*[=:]?\s*(\d)/i)
  if (priorityMatch) {
    data.priority = priorityMatch[1]
  }

  // For create actions, try to extract title
  if (actionType === 'create_task') {
    // The task name might be in the change description
    data.title = changeDescription.replace(/^create\s+/i, '').trim()
    data.status = data.status || 'inbox'
    data.priority = data.priority || '3'
  }

  return data
}

/**
 * Extract references to tasks, projects, etc. from the response.
 */
function extractDataReferences(responseText: string, context: AIContext): DataReference[] {
  const references: DataReference[] = []

  // Find task mentions
  for (const task of context.current_tasks) {
    if (responseText.toLowerCase().includes(task.title.toLowerCase())) {
      references.push({
        type: 'task',
        id: task.id,
        label: task.title,
      })
    }
  }

  // Find project mentions
  for (const project of context.user_summary.projects) {
    if (responseText.toLowerCase().includes(project.name.toLowerCase())) {
      references.push({
        type: 'project',
        id: project.id,
        label: project.name,
      })
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return references.filter(ref => {
    const key = `${ref.type}:${ref.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
