'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createTask } from '@/actions/tasks'
import { Plus, Calendar, Clock, FileText, Info } from 'lucide-react'

interface QuickAddProps {
  projectId: string
  placeholder?: string
}

export function QuickAdd({ projectId }: QuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [estimateHours, setEstimateHours] = useState('')

  function resetForm() {
    setTitle('')
    setNotes('')
    setStartDate('')
    setDueDate('')
    setEstimateHours('')
    setIsExpanded(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)

    const result = await createTask({
      title: title.trim(),
      notes: notes.trim() || null,
      project_id: projectId,
      start_date: startDate || null,
      due_date: dueDate || null,
      estimate_hours: estimateHours ? parseFloat(estimateHours) : null,
      status: 'inbox',
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
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
