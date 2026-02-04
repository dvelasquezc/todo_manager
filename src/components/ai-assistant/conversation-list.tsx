'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getConversations, deleteConversation } from '@/actions/ai-assistant'
import { useAssistant } from './assistant-provider'
import type { AIConversation } from '@/types/ai'

export function ConversationList() {
  const { setCurrentConversation, setView, startNewChat } = useAssistant()
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoading(true)
    const result = await getConversations({ limit: 50 })
    if (result.data) {
      setConversations(result.data)
    }
    setLoading(false)
  }

  const handleSelect = (conversation: AIConversation) => {
    setCurrentConversation(conversation)
    setView('chat')
  }

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    setDeleting(conversationId)
    const result = await deleteConversation(conversationId)
    if (result.success) {
      setConversations(prev => prev.filter(c => c.id !== conversationId))
    }
    setDeleting(null)
  }

  const handleNewChat = () => {
    startNewChat()
    setView('chat')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={handleNewChat} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved conversations</p>
            <p className="text-xs mt-1">
              Start a new conversation and save it to see it here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start justify-between gap-2 cursor-pointer"
                onClick={() => handleSelect(conversation)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(conversation)
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {conversation.title || 'Untitled conversation'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversation.message_count} messages &bull;{' '}
                    {formatDate(conversation.updated_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, conversation.id)}
                  disabled={deleting === conversation.id}
                >
                  {deleting === conversation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }
}
