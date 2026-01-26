'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Clock, Edit2, Trash2, Plus, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  getFocusSessionsForTask,
  updateFocusSession,
  createManualFocusSession,
  deleteFocusSession,
} from '@/actions/focus'
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
  ended_at: string | null
  duration_minutes: number | null
  notes: string | null
}

interface FocusSessionListProps {
  taskId: string
  onUpdate?: () => void
}

export function FocusSessionList({ taskId, onUpdate }: FocusSessionListProps) {
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null)
  const [editDuration, setEditDuration] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addDate, setAddDate] = useState('')
  const [addTime, setAddTime] = useState('')
  const [addDuration, setAddDuration] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getFocusSessionsForTask(taskId)
      if (result.error) {
        setError(result.error)
      } else {
        setSessions(result.data || [])
      }
    } catch (err) {
      setError('Failed to load focus sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [taskId])

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const handleEditClick = (session: FocusSession) => {
    setEditingSession(session)
    setEditDuration(String(session.duration_minutes || ''))
    setEditNotes(session.notes || '')
  }

  const handleEditSave = async () => {
    if (!editingSession) return

    setSaving(true)
    setError(null)
    try {
      const result = await updateFocusSession({
        session_id: editingSession.id,
        duration_minutes: parseInt(editDuration, 10) || editingSession.duration_minutes || 1,
        notes: editNotes || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        // Update local state directly with the new values (avoids refetch race condition)
        const newDuration = parseInt(editDuration, 10) || editingSession.duration_minutes || 1
        setSessions(prev => prev.map(s =>
          s.id === editingSession.id
            ? { ...s, duration_minutes: newDuration, notes: editNotes || null }
            : s
        ))
        setEditingSession(null)
        onUpdate?.()
      }
    } catch (err) {
      setError('Failed to update session')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this focus session?')) return

    setSaving(true)
    setError(null)
    try {
      const result = await deleteFocusSession({ session_id: sessionId })
      if (result.error) {
        setError(result.error)
      } else {
        await fetchSessions()
        onUpdate?.()
      }
    } catch (err) {
      setError('Failed to delete session')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSession = async () => {
    if (!addDate || !addDuration) {
      setError('Date and duration are required')
      return
    }

    const durationMinutes = parseInt(addDuration, 10)
    if (isNaN(durationMinutes) || durationMinutes < 1) {
      setError('Duration must be at least 1 minute')
      return
    }

    // Combine date and time
    const dateTime = addTime ? `${addDate}T${addTime}` : `${addDate}T09:00`

    setSaving(true)
    setError(null)
    try {
      const result = await createManualFocusSession({
        task_id: taskId,
        started_at: dateTime,
        duration_minutes: durationMinutes,
        notes: addNotes || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setShowAddDialog(false)
        setAddDate('')
        setAddTime('')
        setAddDuration('')
        setAddNotes('')
        await fetchSessions()
        onUpdate?.()
      }
    } catch (err) {
      setError('Failed to add session')
    } finally {
      setSaving(false)
    }
  }

  const totalMinutes = sessions
    .filter(s => s.ended_at)
    .reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

  if (loading) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        Loading focus sessions...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Focus Sessions
          <span className="text-muted-foreground font-normal">
            ({formatDuration(totalMinutes)} total)
          </span>
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded">
          No focus sessions recorded yet
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 rounded text-sm"
            >
              {editingSession?.id === session.id ? (
                // Edit mode
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="Duration (min)"
                    className="w-24 h-8"
                    min={1}
                  />
                  <span className="text-muted-foreground">min</span>
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notes"
                    className="flex-1 h-8"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditSave}
                    disabled={saving}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingSession(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(session.started_at), 'MMM d, h:mm a')}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDuration(session.duration_minutes)}
                      </span>
                      {!session.ended_at && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {session.notes}
                      </p>
                    )}
                  </div>
                  {session.ended_at && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditClick(session)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(session.id)}
                        disabled={saving}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Session Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Focus Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Time (optional)</label>
                <Input
                  type="time"
                  value={addTime}
                  onChange={(e) => setAddTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Duration (minutes)</label>
              <Input
                type="number"
                value={addDuration}
                onChange={(e) => setAddDuration(e.target.value)}
                placeholder="e.g., 30"
                min={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
              <Textarea
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="What did you work on?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSession} disabled={saving}>
              {saving ? 'Adding...' : 'Add Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
