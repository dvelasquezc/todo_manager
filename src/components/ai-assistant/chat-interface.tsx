'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageBubble } from './message-bubble'
import { ProposedActionCard } from './proposed-action-card'
import { sendAssistantMessage, getConversationMessages } from '@/actions/ai-assistant'
import { getPendingActions } from '@/actions/ai-proposed-actions'
import { useAssistant } from './assistant-provider'
import type { AIModel, AIMessage, AIProposedAction, ContextInfo } from '@/types/ai'

interface ChatInterfaceProps {
  conversationId?: string
  model: AIModel
}

export function ChatInterface({ conversationId, model }: ChatInterfaceProps) {
  const { setCurrentConversation } = useAssistant()
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [pendingActions, setPendingActions] = useState<AIProposedAction[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId)
      loadPendingActions(conversationId)
      setCurrentConversationId(conversationId)
    } else {
      setMessages([])
      setPendingActions([])
      setCurrentConversationId(undefined)
    }
  }, [conversationId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingActions])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const loadMessages = async (convId: string) => {
    const result = await getConversationMessages(convId)
    if (result.data) {
      setMessages(result.data)
    }
  }

  const loadPendingActions = async (convId: string) => {
    const result = await getPendingActions(convId)
    if (result.data) {
      setPendingActions(result.data)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Optimistically add user message
    const optimisticMessage: AIMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: currentConversationId || '',
      role: 'user',
      content: userMessage,
      model: null,
      tokens_used: null,
      metadata: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMessage])

    const result = await sendAssistantMessage({
      conversation_id: currentConversationId,
      message: userMessage,
      model,
    })

    if (result.error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      // Could show a toast here
      console.error('Error sending message:', result.error)
    } else if (result.data) {
      const data = result.data
      // Update conversation ID if new
      if (!currentConversationId && data.conversation_id) {
        setCurrentConversationId(data.conversation_id)
        // Update the conversation in the provider
        setCurrentConversation({
          id: data.conversation_id,
          user_id: '',
          title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
          model,
          is_saved: false,
          is_archived: false,
          context_summary: null,
          message_count: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      // Replace optimistic message with real one and add assistant message
      setMessages(prev => [
        ...prev.filter(m => m.id !== optimisticMessage.id),
        {
          ...optimisticMessage,
          id: 'user-' + Date.now(),
        },
        data.message,
      ])

      // Update pending actions
      if (data.proposed_actions && data.proposed_actions.length > 0) {
        setPendingActions(prev => [...prev, ...data.proposed_actions!])
      }

      // Update context info
      if (data.context_info) {
        setContextInfo(data.context_info)
      }
    }

    setIsLoading(false)
  }

  const handleActionApplied = (actionId: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">Ask me about your tasks, productivity, or request a report.</p>
            <p className="text-xs mt-2">I can analyze your data and suggest improvements.</p>
            <div className="mt-4 space-y-2 text-xs text-left max-w-[280px] mx-auto">
              <p className="font-medium text-foreground">Try asking:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>&quot;What should I focus on today?&quot;</li>
                <li>&quot;Which tasks are stuck?&quot;</li>
                <li>&quot;How accurate are my estimates?&quot;</li>
                <li>&quot;Give me a weekly review&quot;</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">Suggested Actions:</p>
            {pendingActions.map((action) => (
              <ProposedActionCard
                key={action.id}
                action={action}
                onApplied={() => handleActionApplied(action.id)}
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Info Bar */}
      {contextInfo && (
        <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-2 border-t bg-muted/30">
          <span className={`font-medium px-1.5 py-0.5 rounded ${
            contextInfo.tier === 'max' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
            contextInfo.tier === 'full' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            contextInfo.tier === 'standard' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {contextInfo.tier.toUpperCase()}
          </span>
          <span>•</span>
          <span>{contextInfo.data_summary.active_task_count} tasks</span>
          {contextInfo.data_summary.activity_log_count > 0 && (
            <>
              <span>•</span>
              <span>{contextInfo.data_summary.activity_log_count} logs</span>
            </>
          )}
          <span>•</span>
          <span className={contextInfo.is_cached ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>
            {contextInfo.is_cached ? 'cached' : 'fresh'}
          </span>
          <span className="ml-auto text-muted-foreground/70">
            {contextInfo.tier !== 'max' && 'Say "load max context" for full history'}
          </span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your tasks or request a report..."
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading}
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
