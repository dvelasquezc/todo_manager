'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTask } from '@/actions/tasks'
import { getProjects } from '@/actions/projects'
import { Plus, Calendar, Clock, FileText, Info, Battery, Link2 } from 'lucide-react'
import { EnergySelector } from '@/components/ui/energy-selector'
import { DependencySelector } from '@/components/tasks/dependency-selector'
import type { EnergyLevel, TaskStatus, TaskPriority, Project } from '@/types/database'

interface QuickAddProps {
  projectId?: string
  placeholder?: string
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'next', label: 'Next' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'someday', label: 'Someday' },
]

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: '1', label: 'P1 - Urgent' },
  { value: '2', label: 'P2 - High' },
  { value: '3', label: 'P3 - Medium' },
  { value: '4', label: 'P4 - Low' },
]

export function QuickAdd({ projectId }: QuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  // Form fields
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '')
  const [status, setStatus] = useState<TaskStatus>('inbox')
  const [priority, setPriority] = useState<TaskPriority>('4')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [estimateHours, setEstimateHours] = useState('')
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null)
  const [blockedBy, setBlockedBy] = useState<string | null>(null)

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      const result = await getProjects()
      if (result.data) {
        setProjects(result.data)
        // Set default project if not provided
        if (!projectId && result.data.length > 0) {
          setSelectedProjectId(result.data[0].id)
        }
      }
    }
    loadProjects()
  }, [projectId])

  // Update selectedProjectId when prop changes
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId)
    }
  }, [projectId])

  function resetForm() {
    setTitle('')
    setNotes('')
    setSelectedProjectId(projectId || projects[0]?.id || '')
    setStatus('inbox')
    setPriority('4')
    setStartDate('')
    setDueDate('')
    setEstimateHours('')
    setEnergyLevel(null)
    setBlockedBy(null)
    setIsExpanded(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !selectedProjectId) return

    setIsSubmitting(true)

    const result = await createTask({
      title: title.trim(),
      notes: notes.trim() || null,
      project_id: selectedProjectId,
      start_date: startDate || null,
      due_date: dueDate || null,
      estimate_hours: estimateHours ? parseFloat(estimateHours) : null,
      energy_level: energyLevel,
      blocked_by: blockedBy,
      status,
      priority,
    })

    setIsSubmitting(false)

    if (!result.error) {
      resetForm()
    }
  }

  // Collapsed state - simple input
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Add a new task...</span>
      </button>
    )
  }

  // Expanded state - full form
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Task
        </CardTitle>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Fill in the details for your new task. Only title is required.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium flex items-center gap-1">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-sm font-medium flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Description
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details or context..."
              rows={2}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">Optional notes about this task</p>
          </div>

          {/* Project & Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
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
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)} disabled={isSubmitting}>
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
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)} disabled={isSubmitting}>
              <SelectTrigger className="w-40">
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
            {/* Start Date */}
            <div className="space-y-1.5">
              <label htmlFor="startDate" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">When you&apos;ll start working</p>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">Must be completed by</p>
            </div>
          </div>

          {/* Time Estimate */}
          <div className="space-y-1.5">
            <label htmlFor="estimate" className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Time Estimate (hours)
            </label>
            <Input
              id="estimate"
              type="number"
              min="0"
              max="1000"
              step="0.5"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              placeholder="e.g., 2.5"
              disabled={isSubmitting}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">How long you think it will take</p>
          </div>

          {/* Energy Level */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              <Battery className="h-3 w-3" />
              Energy Level
            </label>
            <EnergySelector
              value={energyLevel}
              onChange={setEnergyLevel}
              size="sm"
            />
            <p className="text-xs text-muted-foreground">How much focus this task requires</p>
          </div>

          {/* Blocked By */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Blocked By
            </label>
            <DependencySelector
              value={blockedBy}
              onChange={setBlockedBy}
              projectId={selectedProjectId}
            />
            <p className="text-xs text-muted-foreground">Task that must be completed first</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !selectedProjectId || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
