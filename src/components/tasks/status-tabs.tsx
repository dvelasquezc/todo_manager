'use client'

import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types/database'

interface StatusTabsProps {
  activeStatus: TaskStatus | 'all'
  onStatusChange: (status: TaskStatus | 'all') => void
  counts?: Record<TaskStatus | 'all', number>
}

const statuses: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'next', label: 'Next' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'someday', label: 'Someday' },
]

export function StatusTabs({ activeStatus, onStatusChange, counts }: StatusTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-1 pb-2 -mx-1 px-1">
      {statuses.map((status) => {
        const count = counts?.[status.value] ?? 0
        const isActive = activeStatus === status.value

        return (
          <button
            key={status.value}
            type="button"
            onClick={() => onStatusChange(status.value)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {status.label}
            {count > 0 && (
              <span className={cn(
                'ml-1.5 px-1.5 py-0.5 text-xs rounded-full',
                isActive ? 'bg-primary-foreground/20' : 'bg-muted'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
