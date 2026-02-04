'use client'

import { useState } from 'react'
import { Bot, X, MessageSquare, FileText, History, Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAssistant } from './assistant-provider'
import { ChatInterface } from './chat-interface'
import { QuickActions } from './quick-actions'
import { ConversationList } from './conversation-list'
import { ModelSelector } from './model-selector'
import { updateConversation, deleteConversation } from '@/actions/ai-assistant'

export function AssistantPanel() {
  const {
    isOpen,
    setIsOpen,
    view,
    setView,
    currentConversation,
    setCurrentConversation,
    selectedModel,
    setSelectedModel,
    startNewChat,
  } = useAssistant()

  const [saving, setSaving] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  const handleSaveConversation = async () => {
    if (!currentConversation) return
    setSaving(true)
    const result = await updateConversation(currentConversation.id, { is_saved: true })
    if (result.success) {
      setCurrentConversation({ ...currentConversation, is_saved: true })
    }
    setSaving(false)
  }

  const handleDiscardConversation = async () => {
    if (!currentConversation) return
    setDiscarding(true)
    const result = await deleteConversation(currentConversation.id)
    if (result.success) {
      startNewChat()
    }
    setDiscarding(false)
  }

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-primary text-primary-foreground p-2 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors hidden md:block"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-5 w-5" />
        </button>
      )}

      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 h-full bg-background border-l z-50 transition-transform duration-300 ease-in-out',
          'w-full md:w-96 lg:w-[420px]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
                disabled={!!currentConversation}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setView('chat')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1',
                view === 'chat'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setView('reports')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1',
                view === 'reports'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="h-4 w-4" />
              Reports
            </button>
            <button
              onClick={() => setView('history')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1',
                view === 'history'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <History className="h-4 w-4" />
              History
            </button>
          </div>

          {/* Conversation Header (when in chat with existing conversation) */}
          {view === 'chat' && currentConversation && (
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
              <span className="text-sm font-medium truncate max-w-[140px]">
                {currentConversation.title || 'Untitled conversation'}
              </span>
              <div className="flex items-center gap-1">
                {!currentConversation.is_saved && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveConversation}
                      disabled={saving}
                      className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Save conversation to history"
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDiscardConversation}
                      disabled={discarding}
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Discard conversation"
                    >
                      {discarding ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </>
                )}
                {currentConversation.is_saved && (
                  <span className="text-xs text-muted-foreground mr-1">Saved</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewChat}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {view === 'chat' && (
              <ChatInterface
                conversationId={currentConversation?.id}
                model={selectedModel}
              />
            )}
            {view === 'reports' && (
              <QuickActions />
            )}
            {view === 'history' && (
              <ConversationList />
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
