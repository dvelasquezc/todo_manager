'use client'

import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIMessage } from '@/types/ai'
import { ChartRenderer, parseAllChartBlocks } from './chart-renderer'

interface MessageBubbleProps {
  message: AIMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={cn(
        'flex gap-3',
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isAssistant ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        {isAssistant ? (
          <Bot className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 min-w-0',
          isAssistant ? 'text-left' : 'text-right'
        )}
      >
        <div
          className={cn(
            'inline-block max-w-full rounded-lg px-4 py-2 text-sm',
            isAssistant
              ? 'bg-muted text-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <FormattedContent content={message.content} />
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-1">
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

function FormattedContent({ content }: { content: string }) {
  // First, parse out any chart blocks
  const segments = parseAllChartBlocks(content)

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'chart') {
          return <ChartRenderer key={`chart-${index}`} config={segment.config} />
        }
        return <FormattedText key={`text-${index}`} content={segment.content} />
      })}
    </>
  )
}

function FormattedText({ content }: { content: string }) {
  // Simple markdown-like formatting
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  let inList = false
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4 my-2 space-y-1">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm">{formatInlineText(item)}</li>
          ))}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Headers
    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {line.slice(4)}
        </h4>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={i} className="font-semibold text-base mt-4 mb-2">
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('# ')) {
      flushList()
      elements.push(
        <h2 key={i} className="font-bold text-lg mt-4 mb-2">
          {line.slice(2)}
        </h2>
      )
    }
    // List items
    else if (line.match(/^[-*]\s/)) {
      inList = true
      listItems.push(line.slice(2))
    }
    // Numbered list items
    else if (line.match(/^\d+\.\s/)) {
      inList = true
      listItems.push(line.replace(/^\d+\.\s/, ''))
    }
    // Empty line
    else if (line.trim() === '') {
      flushList()
      elements.push(<div key={i} className="h-2" />)
    }
    // Regular paragraph
    else {
      flushList()
      elements.push(
        <p key={i} className="text-sm my-1">
          {formatInlineText(line)}
        </p>
      )
    }
  }

  flushList()

  return <>{elements}</>
}

function formatInlineText(text: string): React.ReactNode {
  // Bold text
  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
