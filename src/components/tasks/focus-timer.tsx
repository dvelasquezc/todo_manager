'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Square, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { startFocusSession, endFocusSession, getActiveFocusSession } from '@/actions/focus'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface FocusSession {
  id: string
  task_id: string
  started_at: string
  task?: {
    id: string
    title: string
    project?: {
      id: string
      name: string
      color: string
    }
  }
}

interface FocusTimerProps {
  taskId?: string
  taskTitle?: string
  onSessionEnd?: () => void
}

export function FocusTimer({ taskId, taskTitle, onSessionEnd }: FocusTimerProps) {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [endNotes, setEndNotes] = useState('')

  // Load active session on mount
  useEffect(() => {
    async function loadSession() {
      const result = await getActiveFocusSession()
      if (result.data) {
        setActiveSession(result.data)
        // Calculate elapsed time
        const started = new Date(result.data.started_at)
        const elapsed = Math.floor((Date.now() - started.getTime()) / 1000)
        setElapsedSeconds(elapsed)
      }
    }
    loadSession()
  }, [])

  // Timer tick
  useEffect(() => {
    if (!activeSession) return

    const interval = setInterval(() => {
      const started = new Date(activeSession.started_at)
      const elapsed = Math.floor((Date.now() - started.getTime()) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  // Persist to localStorage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('focus_session', JSON.stringify(activeSession))
    } else {
      localStorage.removeItem('focus_session')
    }
  }, [activeSession])

  const handleStart = useCallback(async () => {
    if (!taskId) return

    setLoading(true)
    const result = await startFocusSession({ task_id: taskId })
    if (result.data) {
      setActiveSession({
        ...result.data,
        task: { id: taskId, title: taskTitle || 'Task' }
      })
      setElapsedSeconds(0)
    }
    setLoading(false)
  }, [taskId, taskTitle])

  const handleStop = useCallback(() => {
    setShowEndDialog(true)
  }, [])

  const confirmEnd = useCallback(async () => {
    if (!activeSession) return

    setLoading(true)
    const result = await endFocusSession({
      session_id: activeSession.id,
      notes: endNotes || null,
    })
    if (result.data) {
      setActiveSession(null)
      setElapsedSeconds(0)
      setEndNotes('')
      onSessionEnd?.()
    }
    setLoading(false)
    setShowEndDialog(false)
  }, [activeSession, endNotes, onSessionEnd])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // If there's an active session for a different task, show compact indicator
  if (activeSession && activeSession.task_id !== taskId) {
    return null
  }

  // If there's an active session for this task
  if (activeSession && activeSession.task_id === taskId) {
    return (
      <>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
            disabled={loading}
            className="h-7 px-2"
          >
            <Square className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
        </div>

        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>End Focus Session</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                You focused for <strong>{formatTime(elapsedSeconds)}</strong> on this task.
              </p>
              <Textarea
                placeholder="Any notes about this session? (optional)"
                value={endNotes}
                onChange={(e) => setEndNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEndDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmEnd} disabled={loading}>
                End Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // No active session, show start button
  if (taskId) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleStart}
        disabled={loading || !!activeSession}
        className="h-7 px-2"
      >
        <Play className="h-3.5 w-3.5 mr-1" />
        Focus
      </Button>
    )
  }

  return null
}

// Floating global timer indicator (shows in header when session is active)
export function FocusTimerIndicator() {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    async function loadSession() {
      const result = await getActiveFocusSession()
      if (result.data) {
        setActiveSession(result.data)
      }
    }
    loadSession()

    // Poll for changes every 30 seconds
    const pollInterval = setInterval(loadSession, 30000)
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    if (!activeSession) return

    const interval = setInterval(() => {
      const started = new Date(activeSession.started_at)
      const elapsed = Math.floor((Date.now() - started.getTime()) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  if (!activeSession) return null

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
      <Clock className="h-4 w-4 animate-pulse" />
      <span className="font-medium truncate max-w-[150px]">
        {activeSession.task?.title || 'Focusing'}
      </span>
      <span className="tabular-nums font-mono">{formatTime(elapsedSeconds)}</span>
    </div>
  )
}
