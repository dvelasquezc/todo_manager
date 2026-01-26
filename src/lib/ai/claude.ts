import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ParsedTask {
  title: string
  notes: string | null
  project_id: string
  start_date: string | null
  due_date: string | null
  estimate_hours: number | null
  priority: '1' | '2' | '3' | '4'
  energy_level: 'low' | 'medium' | 'high' | null
}

interface ProjectInfo {
  id: string
  name: string
}

export async function parseTasksFromText(
  input: string,
  projects: ProjectInfo[],
  defaultProjectId: string
): Promise<ParsedTask[]> {
  const today = new Date().toISOString().split('T')[0]
  const projectList = projects.map(p => `- ${p.name} (id: ${p.id})`).join('\n')

  const systemPrompt = `You are a task parser for a todo list app. Extract tasks from unstructured text and return structured JSON.

For each task you identify, extract:
- title: A clear, actionable task title (start with a verb when possible)
- notes: Any additional context or details (or null)
- project_id: Match the task to the most appropriate project from the list below, or use the default project ID
- start_date: When to start working on it (ISO format YYYY-MM-DD, or null). Parse natural language like "next week", "Monday", "tomorrow"
- due_date: When it's due (ISO format YYYY-MM-DD, or null). Parse natural language like "Friday", "end of month", "in 3 days"
- estimate_hours: How long it will take in hours (number, or null). Parse "2 hours", "30 minutes" (= 0.5), "half day" (= 4)
- priority: 1=urgent/critical, 2=high/important, 3=normal/default, 4=low/nice-to-have. Infer from language like "ASAP", "urgent", "when you have time"
- energy_level: "low" for routine/admin tasks, "medium" for normal work, "high" for deep focus tasks (or null if unclear)

Available projects:
${projectList}

Default project ID (use when no project matches): ${defaultProjectId}

Today's date is: ${today}

IMPORTANT: Return ONLY a valid JSON array of tasks. No markdown, no explanations, just the JSON array.
If the input doesn't contain any tasks, return an empty array: []

Example output format:
[
  {
    "title": "Review quarterly report",
    "notes": "Focus on sales section",
    "project_id": "abc-123",
    "start_date": null,
    "due_date": "2024-01-15",
    "estimate_hours": 2,
    "priority": "2",
    "energy_level": "high"
  }
]`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Parse the following text into tasks:\n\n${input}`,
      },
    ],
    system: systemPrompt,
  })

  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  try {
    // Try to parse the JSON response
    let jsonText = textContent.text.trim()

    // Handle case where Claude wraps in markdown code block
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()

    const parsed = JSON.parse(jsonText) as ParsedTask[]

    // Validate and sanitize each task
    return parsed.map(task => ({
      title: String(task.title || '').slice(0, 500),
      notes: task.notes ? String(task.notes).slice(0, 5000) : null,
      project_id: projects.some(p => p.id === task.project_id) ? task.project_id : defaultProjectId,
      start_date: isValidDate(task.start_date) ? task.start_date : null,
      due_date: isValidDate(task.due_date) ? task.due_date : null,
      estimate_hours: isValidNumber(task.estimate_hours) ? task.estimate_hours : null,
      priority: ['1', '2', '3', '4'].includes(task.priority) ? task.priority : '3',
      energy_level: ['low', 'medium', 'high'].includes(task.energy_level || '') ? task.energy_level : null,
    }))
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse tasks from response')
  }
}

function isValidDate(date: unknown): date is string {
  if (typeof date !== 'string') return false
  const parsed = Date.parse(date)
  return !isNaN(parsed)
}

function isValidNumber(num: unknown): num is number {
  return typeof num === 'number' && !isNaN(num) && num >= 0 && num <= 1000
}
