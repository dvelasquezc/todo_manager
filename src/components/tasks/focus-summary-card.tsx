'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Target, Timer } from 'lucide-react'
import { getTodayFocusSummary } from '@/actions/focus'

interface FocusSession {
  id: string
  task_id: string
  duration_minutes: number | null
  started_at: string
  ended_at: string | null
  notes: string | null
  task: {
    id: string
    title: string
  } | null
}

interface FocusSummary {
  sessions: FocusSession[]
  totalMinutes: number
  totalHours: number
  taskCount: number
}

export function FocusSummaryCard() {
  const [summary, setSummary] = useState<FocusSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSummary() {
      const result = await getTodayFocusSummary()
      if (result.data) {
        setSummary(result.data)
      }
      setLoading(false)
    }
    loadSummary()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Today&apos;s Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.sessions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Today&apos;s Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No focus sessions today. Start a timer on any task to track your work.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group sessions by task
  const taskSessions = summary.sessions.reduce((acc, session) => {
    const taskId = session.task_id
    const taskTitle = session.task?.title || 'Unknown Task'
    if (!acc[taskId]) {
      acc[taskId] = { title: taskTitle, totalMinutes: 0 }
    }
    acc[taskId].totalMinutes += session.duration_minutes || 0
    return acc
  }, {} as Record<string, { title: string; totalMinutes: number }>)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Today&apos;s Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{summary.totalHours}h</p>
              <p className="text-xs text-muted-foreground">Total time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{summary.taskCount}</p>
              <p className="text-xs text-muted-foreground">Tasks worked</p>
            </div>
          </div>
        </div>

        {/* Task breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Breakdown</p>
          <div className="space-y-1">
            {Object.entries(taskSessions).map(([taskId, data]) => (
              <div key={taskId} className="flex justify-between items-center text-sm">
                <span className="truncate max-w-[180px]">{data.title}</span>
                <span className="text-muted-foreground">
                  {Math.round(data.totalMinutes)}m
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
