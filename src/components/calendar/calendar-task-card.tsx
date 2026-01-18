'use client'

import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'
import type { Task, Project } from '@/types/database'

interface CalendarTaskCardProps {
  task: Task & { project?: Project }
  variant?: 'due' | 'start' | 'completed'
}

const priorityColors: Record<string, string> = {
  '1': 'border-l-red-500',
  '2': 'border-l-orange-500',
  '3': 'border-l-blue-500',
  '4': 'border-l-gray-400',
}

const variantStyles = {
  due: 'bg-orange-50 dark:bg-orange-950/20',
  start: 'bg-blue-50 dark:bg-blue-950/20',
  completed: 'bg-green-50 dark:bg-green-950/20 opacity-75',
}

export function CalendarTaskCard({ task, variant = 'due' }: CalendarTaskCardProps) {
  return (
    <div
      className={cn(
        'px-2 py-1.5 rounded text-xs border-l-2 truncate',
        priorityColors[task.priority],
        variantStyles[variant]
      )}
      title={task.title}
    >
      <div className="flex items-center gap-1">
        <span className="truncate font-medium">{task.title}</span>
        {task.estimate_hours && (
          <span className="flex-shrink-0 flex items-center gap-0.5 text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            {task.estimate_hours}h
          </span>
        )}
      </div>
      {task.project && (
        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: task.project.color }}
          />
          <span className="truncate">{task.project.name}</span>
        </div>
      )}
    </div>
  )
}
