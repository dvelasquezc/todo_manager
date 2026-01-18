'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/tasks/task-card'
import { QuickAdd } from '@/components/tasks/quick-add'
import { StatusTabs } from '@/components/tasks/status-tabs'
import type { Task, Project, TaskStatus } from '@/types/database'

export default function ProjectPage() {
  const params = useParams()
  const slug = params.slug as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeStatus, setActiveStatus] = useState<TaskStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()

      if (projectData) {
        setProject(projectData)

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectData.id)
          .neq('status', 'done')
          .order('sort_order')

        setTasks(tasksData || [])
      }

      setLoading(false)
    }

    fetchData()

    // Set up realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${slug}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
      }, () => {
        // Refetch tasks on any change
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-10 bg-muted rounded" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  // Filter tasks by status
  const filteredTasks = activeStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === activeStatus)

  // Calculate counts for each status
  const counts: Record<TaskStatus | 'all', number> = {
    all: tasks.length,
    inbox: tasks.filter(t => t.status === 'inbox').length,
    today: tasks.filter(t => t.status === 'today').length,
    next: tasks.filter(t => t.status === 'next').length,
    waiting: tasks.filter(t => t.status === 'waiting').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    someday: tasks.filter(t => t.status === 'someday').length,
    done: 0, // Not shown in this view
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <span className="text-muted-foreground">
          {tasks.length} tasks
        </span>
      </div>

      {project.description && (
        <p className="text-muted-foreground">{project.description}</p>
      )}

      <QuickAdd projectId={project.id} />

      <StatusTabs
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        counts={counts}
      />

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {activeStatus === 'all'
              ? 'No active tasks in this project'
              : `No tasks in ${activeStatus}`}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  )
}
