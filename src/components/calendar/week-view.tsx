'use client'

import { useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { CalendarTaskCard } from './calendar-task-card'
import type { Task, Project } from '@/types/database'

type TaskWithProject = Task & { project?: Project }

interface WeekViewProps {
  currentDate: Date
  tasks: TaskWithProject[]
  dateField: 'start_date' | 'due_date' | 'completed_at'
  variant: 'due' | 'start' | 'completed'
  emptyMessage?: string
}

export function WeekView({
  currentDate,
  tasks,
  dateField,
  variant,
  emptyMessage = 'No tasks this week',
}: WeekViewProps) {
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

      const taskDate = new Date(dateValue)
      const dateKey = format(taskDate, 'yyyy-MM-dd')

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    })

    return grouped
  }, [tasks, dateField])

  const hasAnyTasks = tasks.length > 0

  return (
    <div className="border rounded-lg overflow-hidden">
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

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'p-1.5 border-r border-t last:border-r-0 min-h-[150px]',
                isToday(day) && 'bg-primary/5'
              )}
            >
              <div className="space-y-1">
                {dayTasks.map((task) => (
                  <CalendarTaskCard
                    key={task.id}
                    task={task}
                    variant={variant}
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
