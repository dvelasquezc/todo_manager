'use client'

import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Button } from '@/components/ui/button'
import { WeekView } from '@/components/calendar/week-view'
import { getTasksForCalendar } from '@/actions/tasks'
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle } from 'lucide-react'
import type { Task, Project } from '@/types/database'

type TaskWithProject = Task & { project?: Project }

type TabType = 'due' | 'starting' | 'completed'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<TabType>('due')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<{
    dueTasks: TaskWithProject[]
    startTasks: TaskWithProject[]
    completedTasks: TaskWithProject[]
  }>({
    dueTasks: [],
    startTasks: [],
    completedTasks: [],
  })

  // Get week boundaries
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  // Fetch tasks when week changes
  useEffect(() => {
    async function fetchTasks() {
      setLoading(true)
      const result = await getTasksForCalendar(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      )
      if (result.data) {
        setTasks(result.data as typeof tasks)
      }
      setLoading(false)
    }
    fetchTasks()
  }, [currentDate])

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
      ) : (
        <>
          {activeTab === 'due' && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks.dueTasks}
              dateField="due_date"
              variant="due"
              emptyMessage="No tasks due this week"
            />
          )}
          {activeTab === 'starting' && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks.startTasks}
              dateField="start_date"
              variant="start"
              emptyMessage="No tasks starting this week"
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
    </div>
  )
}
