'use client'

import { useState } from 'react'
import { Check, X, Loader2, ArrowRight, Plus, Edit, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { applyProposedAction, rejectProposedAction } from '@/actions/ai-proposed-actions'
import type { AIProposedAction, ActionType, ProposedTaskData } from '@/types/ai'

interface ProposedActionCardProps {
  action: AIProposedAction
  onApplied: () => void
}

const actionIcons: Record<ActionType, typeof Check> = {
  create_task: Plus,
  update_task: Edit,
  move_task: ArrowRight,
  complete_task: CheckCircle,
  delete_task: Trash2,
  create_project: Plus,
}

const actionLabels: Record<ActionType, string> = {
  create_task: 'Create Task',
  update_task: 'Update Task',
  move_task: 'Move Task',
  complete_task: 'Complete Task',
  delete_task: 'Delete Task',
  create_project: 'Create Project',
}

export function ProposedActionCard({ action, onApplied }: ProposedActionCardProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const Icon = actionIcons[action.action_type]
  const data = action.proposed_data as ProposedTaskData

  const handleApply = async () => {
    setIsApplying(true)
    const result = await applyProposedAction({ action_id: action.id })
    if (!result.error) {
      onApplied()
    } else {
      console.error('Failed to apply action:', result.error)
    }
    setIsApplying(false)
  }

  const handleReject = async () => {
    setIsRejecting(true)
    const result = await rejectProposedAction({ action_id: action.id })
    if (!result.error) {
      onApplied()
    }
    setIsRejecting(false)
  }

  const renderProposedChanges = () => {
    if (action.action_type === 'create_task') {
      return (
        <div className="text-sm">
          <p className="font-medium">{data.title}</p>
          {data.notes && (
            <p className="text-xs text-muted-foreground line-clamp-1">{data.notes}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {data.status && (
              <span className="text-xs px-1.5 py-0.5 bg-muted rounded">{data.status}</span>
            )}
            {data.priority && (
              <span className="text-xs px-1.5 py-0.5 bg-muted rounded">P{data.priority}</span>
            )}
            {data.due_date && (
              <span className="text-xs px-1.5 py-0.5 bg-muted rounded">Due: {data.due_date}</span>
            )}
          </div>
        </div>
      )
    }

    if (action.action_type === 'move_task') {
      const originalStatus = (action.original_data as Record<string, unknown>)?.status as string
      return (
        <div className="text-sm flex items-center gap-2">
          <span className="text-muted-foreground">{originalStatus || 'current'}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium">{data.status}</span>
        </div>
      )
    }

    if (action.action_type === 'complete_task') {
      return (
        <div className="text-sm">
          <p className="text-muted-foreground">Mark task as done</p>
        </div>
      )
    }

    if (action.action_type === 'update_task') {
      const changes = Object.entries(data).filter(([key, value]) => {
        const original = (action.original_data as Record<string, unknown>)?.[key]
        return original !== value
      })

      return (
        <div className="text-sm space-y-1">
          {changes.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-muted-foreground capitalize">
                {key.replace('_', ' ')}:
              </span>
              <span className="font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )
    }

    if (action.action_type === 'delete_task') {
      return (
        <div className="text-sm text-destructive">
          <p>This task will be permanently deleted</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="border rounded-lg p-3 bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-1.5 rounded bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {actionLabels[action.action_type]}
          </p>
          {renderProposedChanges()}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={isApplying || isRejecting}
          className="flex-1"
        >
          {isApplying ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Check className="h-3 w-3 mr-1" />
          )}
          Apply
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isApplying || isRejecting}
        >
          {isRejecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  )
}
