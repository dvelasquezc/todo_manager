'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EnergySelector } from '@/components/ui/energy-selector'
import { DependencySelector } from '@/components/tasks/dependency-selector'
import { FocusSessionList } from '@/components/tasks/focus-session-list'
import { updateTask, deleteTask } from '@/actions/tasks'
import { getProjects } from '@/actions/projects'
import { Trash2, Loader2 } from 'lucide-react'
import type { Task, Project, TaskStatus, EnergyLevel, TaskPriority } from '@/types/database'

interface TaskEditModalProps {
  task: Task
  project?: Project
  open: boolean
  onClose: () => void
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'next', label: 'Next' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'someday', label: 'Someday' },
  { value: 'done', label: 'Done' },
]

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: '1', label: 'P1 - Urgent' },
  { value: '2', label: 'P2 - High' },
  { value: '3', label: 'P3 - Medium' },
  { value: '4', label: 'P4 - Low' },
]

export function TaskEditModal({ task, project, open, onClose }: TaskEditModalProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  // Callback when focus sessions are updated
  const handleFocusSessionUpdate = useCallback(() => {
    // Trigger a refresh to update the task card's actual_hours display
    router.refresh()
  }, [router])

  // Form state
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [projectId, setProjectId] = useState(task.project_id)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [startDate, setStartDate] = useState(task.start_date || '')
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [estimateHours, setEstimateHours] = useState(task.estimate_hours?.toString() || '')
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(task.energy_level)
  const [blockedBy, setBlockedBy] = useState<string | null>(task.blocked_by)

  // Load projects for dropdown
  useEffect(() => {
    async function loadProjects() {
      const result = await getProjects()
      if (result.data) {
        setProjects(result.data)
      }
    }
    loadProjects()
  }, [])

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title)
    setNotes(task.notes || '')
    setProjectId(task.project_id)
    setStatus(task.status)
    setPriority(task.priority)
    setStartDate(task.start_date || '')
    setDueDate(task.due_date || '')
    setEstimateHours(task.estimate_hours?.toString() || '')
    setEnergyLevel(task.energy_level)
    setBlockedBy(task.blocked_by)
  }, [task])

  const handleSave = async () => {
    if (!title.trim()) return

    setSaving(true)
    const result = await updateTask(task.id, {
      title: title.trim(),
      notes: notes.trim() || null,
      project_id: projectId,
      status,
      priority,
      start_date: startDate || null,
      due_date: dueDate || null,
      estimate_hours: estimateHours ? parseFloat(estimateHours) : null,
      energy_level: energyLevel,
      blocked_by: blockedBy,
    })
    setSaving(false)

    if (!result.error) {
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return

    setDeleting(true)
    await deleteTask(task.id)
    setDeleting(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
            />
          </div>

          {/* Project & Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Estimate */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time Estimate (hours)</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              placeholder="e.g., 2.5"
              className="w-32"
            />
          </div>

          {/* Energy Level */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Energy Level</label>
            <EnergySelector value={energyLevel} onChange={setEnergyLevel} />
          </div>

          {/* Blocked By */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Blocked By</label>
            <DependencySelector
              value={blockedBy}
              onChange={setBlockedBy}
              currentTaskId={task.id}
              projectId={projectId}
            />
          </div>

          {/* Divider */}
          <div className="border-t pt-4">
            {/* Focus Sessions */}
            <FocusSessionList taskId={task.id} onUpdate={handleFocusSessionUpdate} />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
