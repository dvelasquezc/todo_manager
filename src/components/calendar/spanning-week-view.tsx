'use client'

import { useMemo, useState, DragEvent } from 'react'
import { format, startOfWeek, addDays, isToday, differenceInDays, min, max, isBefore, isAfter } from 'date-fns'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'
import { rescheduleTask } from '@/actions/tasks'
import type { Task, Project } from '@/types/database'

type TaskWithProject = Task & { project?: Project }

interface SpanningWeekViewProps {
  currentDate: Date
  tasks: TaskWithProject[]
  emptyMessage?: string
  onTaskMoved?: () => void
}

interface TaskBarProps {
  task: TaskWithProject
  startColumn: number // 0-6 for Monday-Sunday
  spanColumns: number // how many columns this task spans
  rowIndex: number
  onDragStart: (e: DragEvent<HTMLDivElement>, taskId: string) => void
}

const priorityColors: Record<string, string> = {
  '1': 'bg-red-100 dark:bg-red-950/40 border-red-300',
  '2': 'bg-orange-100 dark:bg-orange-950/40 border-orange-300',
  '3': 'bg-blue-100 dark:bg-blue-950/40 border-blue-300',
  '4': 'bg-gray-100 dark:bg-gray-950/40 border-gray-300',
}

function TaskBar({ task, startColumn, spanColumns, rowIndex, onDragStart }: TaskBarProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(e, task.id)
  }

  // Calculate left position and width as percentages
  const leftPercent = (startColumn / 7) * 100
  const widthPercent = (spanColumns / 7) * 100

  return (
    <div
      className={cn(
        'absolute h-8 rounded border cursor-grab hover:shadow-md active:cursor-grabbing active:opacity-50 transition-all flex items-center px-2 overflow-hidden',
        priorityColors[task.priority]
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        top: `${rowIndex * 36 + 4}px`, // 36px per row with 4px offset
      }}
      title={`${task.title} (${task.start_date} - ${task.due_date || 'ongoing'})`}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {task.project && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: task.project.color }}
          />
        )}
        <span className="truncate text-xs font-medium">{task.title}</span>
        {task.estimate_hours && (
          <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            {task.estimate_hours}h
          </span>
        )}
      </div>
    </div>
  )
}

export function SpanningWeekView({
  currentDate,
  tasks,
  emptyMessage = 'No tasks in progress',
  onTaskMoved,
}: SpanningWeekViewProps) {
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  // Get the start of the week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  const today = new Date()

  // Generate array of 7 days
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  // Calculate task bars with their positions
  const taskBars = useMemo(() => {
    return tasks.map((task) => {
      // Add T12:00:00 to avoid timezone issues with date-only strings
      const taskStart = new Date(task.start_date + 'T12:00:00')
      const taskEnd = task.due_date ? new Date(task.due_date + 'T12:00:00') : today

      // Clamp to week boundaries
      const displayStart = max([taskStart, weekStart])
      const displayEnd = min([taskEnd, weekEnd, today])

      // Calculate column indices (0 = Monday)
      const startColumn = Math.max(0, differenceInDays(displayStart, weekStart))
      const endColumn = Math.min(6, differenceInDays(displayEnd, weekStart))
      const spanColumns = endColumn - startColumn + 1

      return {
        task,
        startColumn,
        spanColumns: Math.max(1, spanColumns),
      }
    })
  }, [tasks, weekStart, weekEnd, today])

  const hasAnyTasks = tasks.length > 0

  // Calculate the required height based on number of tasks
  const containerHeight = Math.max(150, taskBars.length * 36 + 20)

  const handleDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
    // Visual feedback could be added here
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(dateKey)
  }

  const handleDragLeave = () => {
    setDragOverDay(null)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    e.preventDefault()
    setDragOverDay(null)

    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    setIsMoving(true)
    try {
      // In the spanning view, dragging updates the start_date
      const result = await rescheduleTask(taskId, dateKey, 'start_date')
      if (result.error) {
        console.error('Failed to reschedule task:', result.error)
      } else {
        onTaskMoved?.()
      }
    } catch (error) {
      console.error('Error rescheduling task:', error)
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', isMoving && 'opacity-50 pointer-events-none')}>
      {/* Header row with day names */}
      <div className="grid grid-cols-7 bg-muted/50">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'px-2 py-2 text-center border-r last:border-r-0',
              isToday(day) && 'bg-primary/10'
            )}
          >
            <div className="text-xs text-muted-foreground font-medium">
              {format(day, 'EEE')}
            </div>
            <div
              className={cn(
                'text-sm font-semibold',
                isToday(day) && 'text-primary'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Task bars area */}
      <div className="relative" style={{ minHeight: `${containerHeight}px` }}>
        {/* Grid columns for drop zones */}
        <div className="grid grid-cols-7 absolute inset-0">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const isDropTarget = dragOverDay === dateKey

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-r last:border-r-0 transition-colors',
                  isToday(day) && 'bg-primary/5',
                  isDropTarget && 'bg-primary/20 ring-2 ring-primary ring-inset'
                )}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateKey)}
              />
            )
          })}
        </div>

        {/* Task bars */}
        {taskBars.map((bar, index) => (
          <TaskBar
            key={bar.task.id}
            task={bar.task}
            startColumn={bar.startColumn}
            spanColumns={bar.spanColumns}
            rowIndex={index}
            onDragStart={handleDragStart}
          />
        ))}
      </div>

      {/* Empty state */}
      {!hasAnyTasks && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      )}

      {/* Legend */}
      {hasAnyTasks && (
        <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          Drag tasks to change their start date. Bars show duration from start date to today or due date.
        </div>
      )}
    </div>
  )
}
