'use client'

import { useMemo, useState, DragEvent } from 'react'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { CalendarTaskCard } from './calendar-task-card'
import { rescheduleTask } from '@/actions/tasks'
import type { Task, Project } from '@/types/database'

type TaskWithProject = Task & { project?: Project }

interface WeekViewProps {
  currentDate: Date
  tasks: TaskWithProject[]
  dateField: 'start_date' | 'due_date' | 'completed_at'
  variant: 'due' | 'start' | 'completed' | 'inprogress'
  emptyMessage?: string
  onTaskMoved?: () => void
}

export function WeekView({
  currentDate,
  tasks,
  dateField,
  variant,
  emptyMessage = 'No tasks this week',
  onTaskMoved,
}: WeekViewProps) {
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  // Get the start of the week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })

  // Generate array of 7 days
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskWithProject[]> = {}

    tasks.forEach((task) => {
      const dateValue = task[dateField]
      if (!dateValue) return

      // Extract just the date part (yyyy-MM-dd) to avoid timezone issues
      // dateValue could be '2026-01-20' or '2026-01-20T00:00:00.000Z'
      const dateKey = dateValue.toString().slice(0, 10)

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    })

    return grouped
  }, [tasks, dateField])

  const hasAnyTasks = tasks.length > 0

  // Drag and drop is enabled for non-completed variants
  const isDraggable = variant !== 'completed'

  // Determine which date field to update based on variant
  const getDateFieldToUpdate = (): 'due_date' | 'start_date' => {
    if (variant === 'due') return 'due_date'
    return 'start_date' // 'start' and 'inprogress' both update start_date
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    if (!isDraggable) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(dateKey)
  }

  const handleDragLeave = () => {
    setDragOverDay(null)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    if (!isDraggable) return
    e.preventDefault()
    setDragOverDay(null)

    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    setIsMoving(true)
    try {
      const dateFieldToUpdate = getDateFieldToUpdate()
      const result = await rescheduleTask(taskId, dateKey, dateFieldToUpdate)
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

      {/* Task rows */}
      <div className="grid grid-cols-7 min-h-[200px]">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDate[dateKey] || []
          const isDropTarget = dragOverDay === dateKey

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'p-1.5 border-r border-t last:border-r-0 min-h-[150px] transition-colors',
                isToday(day) && 'bg-primary/5',
                isDropTarget && isDraggable && 'bg-primary/20 ring-2 ring-primary ring-inset'
              )}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dateKey)}
            >
              <div className="space-y-1">
                {dayTasks.map((task) => (
                  <CalendarTaskCard
                    key={task.id}
                    task={task}
                    variant={variant}
                    draggable={isDraggable}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {!hasAnyTasks && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}
