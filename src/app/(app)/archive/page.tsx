'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/tasks/task-card'
import { Select } from '@/components/ui/select'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from 'date-fns'
import { Archive } from 'lucide-react'
import type { Task, Project } from '@/types/database'

type DateFilter = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all'

interface TaskWithProject extends Task {
  project: Project
}

export default function ArchivePage() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [dateFilter, setDateFilter] = useState<DateFilter>('this-week')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('sort_order')

      setProjects(projectsData || [])

      // Build date range
      const now = new Date()
      let startDate: Date | null = null
      let endDate: Date | null = null

      switch (dateFilter) {
        case 'this-week':
          startDate = startOfWeek(now, { weekStartsOn: 1 })
          endDate = endOfWeek(now, { weekStartsOn: 1 })
          break
        case 'last-week':
          startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
          endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
          break
        case 'this-month':
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case 'last-month':
          startDate = startOfMonth(subMonths(now, 1))
          endDate = endOfMonth(subMonths(now, 1))
          break
      }

      // Fetch completed tasks
      let query = supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .eq('status', 'done')
        .order('completed_at', { ascending: false })

      if (startDate && endDate) {
        query = query
          .gte('completed_at', startDate.toISOString())
          .lte('completed_at', endDate.toISOString())
      }

      if (projectFilter !== 'all') {
        query = query.eq('project_id', projectFilter)
      }

      const { data: tasksData } = await query

      setTasks((tasksData as TaskWithProject[]) || [])
      setLoading(false)
    }

    fetchData()
  }, [dateFilter, projectFilter])

  // Calculate stats
  const totalTasks = tasks.length
  const totalHours = tasks.reduce((sum, t) => sum + (t.actual_hours || t.estimate_hours || 0), 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Archive className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Archive</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="w-40"
        >
          <option value="this-week">This Week</option>
          <option value="last-week">Last Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="all">All Time</option>
        </Select>

        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-40"
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Tasks Completed</p>
          <p className="text-2xl font-bold">{totalTasks}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Hours Logged</p>
          <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No completed tasks for this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium line-through text-muted-foreground">
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${task.project.color}20` }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: task.project.color }}
                      />
                      {task.project.name}
                    </span>
                    {task.completed_at && (
                      <span>
                        Completed {format(new Date(task.completed_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                    {task.actual_hours && (
                      <span>{task.actual_hours}h actual</span>
                    )}
                  </div>
                  {task.outcome_note && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {task.outcome_note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
