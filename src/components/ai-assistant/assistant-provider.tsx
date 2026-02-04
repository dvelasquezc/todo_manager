'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AIModel, AIConversation } from '@/types/ai'

interface AssistantContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
  view: 'chat' | 'reports' | 'history'
  setView: (view: 'chat' | 'reports' | 'history') => void
  currentConversation: AIConversation | null
  setCurrentConversation: (conversation: AIConversation | null) => void
  selectedModel: AIModel
  setSelectedModel: (model: AIModel) => void
  startNewChat: () => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider')
  }
  return context
}

interface AssistantProviderProps {
  children: ReactNode
  defaultModel?: AIModel
}

export function AssistantProvider({ children, defaultModel = 'claude-opus-4-20250514' }: AssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'chat' | 'reports' | 'history'>('chat')
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null)
  const [selectedModel, setSelectedModel] = useState<AIModel>(defaultModel)

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const startNewChat = useCallback(() => {
    setCurrentConversation(null)
    setView('chat')
  }, [])

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle,
        view,
        setView,
        currentConversation,
        setCurrentConversation,
        selectedModel,
        setSelectedModel,
        startNewChat,
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}
