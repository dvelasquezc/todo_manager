'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { moveTask, deleteTask } from '@/actions/tasks'
import { Check, Circle, Clock, Calendar, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Task, TaskStatus, Project } from '@/types/database'

interface TaskCardProps {
  task: Task
  project?: Project
  showProject?: boolean
  onComplete?: () => void
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

const priorityColors: Record<string, string> = {
  '1': 'bg-red-500',
  '2': 'bg-orange-500',
  '3': 'bg-blue-500',
  '4': 'bg-gray-400',
}

export function TaskCard({ task, project, showProject = false, onComplete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsUpdating(true)
    await moveTask(task.id, newStatus)
    setIsUpdating(false)
    if (newStatus === 'done' && onComplete) {
      onComplete()
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id)
    }
  }

  const handleToggleComplete = async () => {
    if (task.status === 'done') {
      await moveTask(task.id, 'inbox')
    } else {
      await moveTask(task.id, 'done')
      if (onComplete) onComplete()
    }
  }

  return (
    <div
      className={cn(
        'group bg-card border rounded-lg p-3 transition-shadow hover:shadow-md',
        task.status === 'done' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Complete checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5',
            task.status === 'done'
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/50 hover:border-primary'
          )}
        >
          {task.status === 'done' && <Check className="w-3 h-3" />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                'font-medium text-sm',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h3>

            {/* Priority indicator */}
            <div
              className={cn(
                'flex-shrink-0 w-2 h-2 rounded-full',
                priorityColors[task.priority]
              )}
              title={`Priority ${task.priority}`}
            />
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
            {showProject && project && (
              <Badge variant="secondary" className="text-xs">
                <span
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </Badge>
            )}

            {task.start_date && (
              <span className="flex items-center gap-1 text-blue-600">
                <Circle className="w-3 h-3" />
                Start: {format(new Date(task.start_date), 'MMM d')}
              </span>
            )}

            {task.due_date && (
              <span className="flex items-center gap-1 text-orange-600">
                <Calendar className="w-3 h-3" />
                Due: {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}

            {task.estimate_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.estimate_hours}h
              </span>
            )}
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-3 pt-3 border-t space-y-3">
              {task.notes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={isUpdating}
                  className="text-xs h-8"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive h-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {(task.start_date || task.due_date) && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {task.start_date && (
                    <p>Start: {format(new Date(task.start_date), 'MMMM d, yyyy')}</p>
                  )}
                  {task.due_date && (
                    <p>Due: {format(new Date(task.due_date), 'MMMM d, yyyy')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expand button */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-1 rounded hover:bg-accent text-muted-foreground"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
