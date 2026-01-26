'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/tasks/task-card'
import { deleteTask } from '@/actions/tasks'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from 'date-fns'
import { Archive, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task, Project } from '@/types/database'

const PAGE_SIZE = 50

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
        .eq('status', 'done')
        .order('completed_at', { ascending: false })

      if (startDate && endDate) {
        // Use date strings directly with UTC time boundaries to avoid timezone shifts
        const startISO = format(startDate, 'yyyy-MM-dd') + 'T00:00:00.000Z'
        const endISO = format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z'
        query = query
          .gte('completed_at', startISO)
          .lte('completed_at', endISO)
      }

      if (projectFilter !== 'all') {
        query = query.eq('project_id', projectFilter)
      }

      // Get total count first
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'done')

      setTotalCount(count || 0)

      // Apply pagination
      const offset = (page - 1) * PAGE_SIZE
      query = query.range(offset, offset + PAGE_SIZE - 1)

      const { data: tasksData } = await query

      setTasks((tasksData as TaskWithProject[]) || [])
      setLoading(false)
    }

    fetchData()
  }, [dateFilter, projectFilter, page])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [dateFilter, projectFilter])

  const handleDelete = async (taskId: string) => {
    if (!confirm('Permanently delete this task? This will affect your dashboard stats.')) return
    setDeletingId(taskId)
    const result = await deleteTask(taskId)
    if (!result.error) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setTotalCount(prev => prev - 1)
    }
    setDeletingId(null)
  }

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
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="w-40 h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="this-week">This Week</option>
          <option value="last-week">Last Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="all">All Time</option>
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-40 h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
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
                <button
                  onClick={() => handleDelete(task.id)}
                  disabled={deletingId === task.id}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete permanently"
                >
                  {deletingId === task.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="px-3 py-2 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>

          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
