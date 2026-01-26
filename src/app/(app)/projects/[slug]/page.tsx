'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/tasks/task-card'
import { TaskEditModal } from '@/components/tasks/task-edit-modal'
import { QuickAdd } from '@/components/tasks/quick-add'
import { StatusTabs } from '@/components/tasks/status-tabs'
import { ProjectEditModal } from '@/components/projects/project-edit-modal'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import type { Task, Project, TaskStatus } from '@/types/database'

export default function ProjectPage() {
  const params = useParams()
  const slug = params.slug as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeStatus, setActiveStatus] = useState<TaskStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const projectIdRef = useRef<string | null>(null)

  // Initial data load with AbortController to prevent race conditions
  useEffect(() => {
    const abortController = new AbortController()

    // Reset state immediately when slug changes to show loading
    setLoading(true)
    setProject(null)
    setTasks([])

    async function fetchData() {
      const supabase = createClient()

      // Fetch project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()

      // Check if this request was aborted (user navigated to different project)
      if (abortController.signal.aborted) return

      if (projectData) {
        setProject(projectData)
        projectIdRef.current = projectData.id

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectData.id)
          .neq('status', 'done')
          .order('sort_order')

        // Check again before setting state
        if (abortController.signal.aborted) return

        setTasks(tasksData || [])
      }

      setLoading(false)
    }

    fetchData()

    // Cleanup: abort on unmount or slug change
    return () => abortController.abort()
  }, [slug])

  // Realtime subscription disabled - was causing POST request spam
  // TODO: Re-enable with proper polling or manual refresh instead
  // useEffect(() => {
  //   if (!project?.id) return
  //   const supabase = createClient()
  //   let debounceTimer: NodeJS.Timeout | null = null
  //   const channel = supabase
  //     .channel(`project-tasks:${project.id}`)
  //     .on('postgres_changes', {
  //       event: '*',
  //       schema: 'public',
  //       table: 'tasks',
  //       filter: `project_id=eq.${project.id}`,
  //     }, () => {
  //       if (debounceTimer) clearTimeout(debounceTimer)
  //       debounceTimer = setTimeout(() => fetchTasks(project.id), 500)
  //     })
  //     .subscribe()
  //   return () => {
  //     if (debounceTimer) clearTimeout(debounceTimer)
  //     supabase.removeChannel(channel)
  //   }
  // }, [project?.id, fetchTasks])

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
      <div className="flex items-center justify-between">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditModalOpen(true)}
          title="Project settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
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
            <TaskCard
              key={task.id}
              task={task}
              project={project}
              onEdit={(t) => setEditingTask(t)}
            />
          ))
        )}
      </div>

      {/* Task Edit Modal - shared instance */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          project={project}
          open={true}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Project Edit Modal */}
      <ProjectEditModal
        project={project}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
    </div>
  )
}
