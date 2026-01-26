'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, Clock, RefreshCw, ZapOff, ChevronDown, ChevronUp } from 'lucide-react'
import { getFrictionAlerts, type FrictionAlert } from '@/actions/analytics'

interface CalendarFrictionAlertsProps {
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

export function CalendarFrictionAlerts({ onTaskClick }: CalendarFrictionAlertsProps) {
  const [alerts, setAlerts] = useState<FrictionAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true)
      try {
        const result = await getFrictionAlerts()
        if (result.data) {
          setAlerts(result.data)
        }
      } catch (err) {
        console.error('Failed to load friction alerts:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAlerts()
  }, [])

  if (loading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4" />
          Loading friction alerts...
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4 opacity-50" />
          No friction alerts - nice work!
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="font-medium text-sm">Friction Alerts</span>
          <span className="text-xs bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Alerts list */}
      {expanded && (
        <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
          {alerts.map((alert, index) => {
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
      )}
    </div>
  )
}
