'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Button } from '@/components/ui/button'
import { WeekView } from '@/components/calendar/week-view'
import { SpanningWeekView } from '@/components/calendar/spanning-week-view'
import { CalendarFrictionAlerts } from '@/components/calendar/friction-alerts'
import { getTasksForCalendar, getInProgressTasksForCalendar } from '@/actions/tasks'
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react'
import type { Task, Project } from '@/types/database'

type TaskWithProject = Task & { project?: Project }

type TabType = 'due' | 'starting' | 'completed' | 'inprogress'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<TabType>('due')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [tasks, setTasks] = useState<{
    dueTasks: TaskWithProject[]
    startTasks: TaskWithProject[]
    completedTasks: TaskWithProject[]
    inProgressTasks: TaskWithProject[]
  }>({
    dueTasks: [],
    startTasks: [],
    completedTasks: [],
    inProgressTasks: [],
  })

  // Get week boundaries - memoized to prevent unnecessary recalculations
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])

  // Fetch tasks when week changes or when refreshKey changes
  useEffect(() => {
    async function fetchTasks() {
      setLoading(true)
      setError(null)
      try {
        const startStr = format(weekStart, 'yyyy-MM-dd')
        const endStr = format(weekEnd, 'yyyy-MM-dd')

        // Fetch all task types in parallel
        const [calendarResult, inProgressResult] = await Promise.all([
          getTasksForCalendar(startStr, endStr),
          getInProgressTasksForCalendar(startStr, endStr),
        ])

        if (calendarResult.error) {
          setError(calendarResult.error)
        } else if (calendarResult.data) {
          setTasks({
            dueTasks: calendarResult.data.dueTasks,
            startTasks: calendarResult.data.startTasks,
            completedTasks: calendarResult.data.completedTasks,
            inProgressTasks: inProgressResult.data || [],
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendar')
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [weekStart, weekEnd, refreshKey])

  // Callback to refresh tasks after a task is moved
  const handleTaskMoved = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const tabs = [
    {
      id: 'due' as const,
      label: 'Due This Week',
      icon: Calendar,
      count: tasks.dueTasks.length,
    },
    {
      id: 'starting' as const,
      label: 'Starting Soon',
      icon: Clock,
      count: tasks.startTasks.length,
    },
    {
      id: 'inprogress' as const,
      label: 'In Progress',
      icon: PlayCircle,
      count: tasks.inProgressTasks.length,
    },
    {
      id: 'completed' as const,
      label: 'Completed',
      icon: CheckCircle,
      count: tasks.completedTasks.length,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">
          View your tasks by week
        </p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading...
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive font-medium">Error loading calendar</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCurrentDate(new Date(currentDate))}
          >
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {activeTab === 'due' && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks.dueTasks}
              dateField="due_date"
              variant="due"
              emptyMessage="No tasks due this week"
              onTaskMoved={handleTaskMoved}
            />
          )}
          {activeTab === 'starting' && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks.startTasks}
              dateField="start_date"
              variant="start"
              emptyMessage="No tasks starting this week"
              onTaskMoved={handleTaskMoved}
            />
          )}
          {activeTab === 'inprogress' && (
            <SpanningWeekView
              currentDate={currentDate}
              tasks={tasks.inProgressTasks}
              emptyMessage="No tasks in progress (tasks need a start date to appear here)"
              onTaskMoved={handleTaskMoved}
            />
          )}
          {activeTab === 'completed' && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks.completedTasks}
              dateField="completed_at"
              variant="completed"
              emptyMessage="No tasks completed this week"
            />
          )}
        </>
      )}

      {/* Friction Alerts Section */}
      {!loading && !error && (
        <CalendarFrictionAlerts />
      )}
    </div>
  )
}
