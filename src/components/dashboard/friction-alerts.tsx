'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Clock, RefreshCw, ZapOff } from 'lucide-react'
import type { FrictionAlert } from '@/actions/analytics'

interface FrictionAlertsProps {
  data: FrictionAlert[]
  onTaskClick?: (taskId: string) => void
}

const alertConfig: Record<FrictionAlert['type'], {
  icon: typeof AlertTriangle
  color: string
  bgColor: string
  label: string
}> = {
  overdue: {
    icon: Clock,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    label: 'Overdue',
  },
  stuck_today: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    label: 'Stuck',
  },
  high_churn: {
    icon: RefreshCw,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    label: 'High Churn',
  },
  stale: {
    icon: ZapOff,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
    label: 'Stale',
  },
}

export function FrictionAlerts({ data, onTaskClick }: FrictionAlertsProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No friction alerts - nice work!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.map((alert, index) => {
        const config = alertConfig[alert.type]
        const Icon = config.icon

        return (
          <div
            key={`${alert.taskId}-${index}`}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
              config.bgColor,
              'hover:opacity-80'
            )}
            onClick={() => onTaskClick?.(alert.taskId)}
          >
            <div className={cn('flex-shrink-0 mt-0.5', config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-medium', config.color)}>
                  {config.label}
                </span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: alert.projectColor }}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {alert.projectName}
                </span>
              </div>
              <p className="text-sm font-medium truncate mt-0.5">
                {alert.taskTitle}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alert.detail}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
