import { createClient } from '@/lib/supabase/server'
import { TaskList } from '@/components/tasks/task-list'
import { FocusSummaryCard } from '@/components/tasks/focus-summary-card'
import { Sun } from 'lucide-react'
import type { Project } from '@/types/database'

export default async function TodayPage() {
  const supabase = await createClient()

  // Get all today tasks across all projects
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('status', 'today')
    .order('sort_order')

  // Create a map of projects for the task cards
  const projectMap: Record<string, Project> = {}
  tasks?.forEach((task) => {
    if (task.project) {
      projectMap[task.project.id] = task.project
    }
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Sun className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">Today</h1>
        <span className="text-muted-foreground">
          {tasks?.length ?? 0} tasks
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task list */}
        <div className="lg:col-span-2">
          {tasks?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sun className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks for today</p>
              <p className="text-sm">Move tasks to Today from your projects or inbox</p>
            </div>
          ) : (
            <TaskList
              tasks={tasks || []}
              projects={projectMap}
              showProject
            />
          )}
        </div>

        {/* Focus summary sidebar */}
        <div className="lg:col-span-1">
          <FocusSummaryCard />
        </div>
      </div>
    </div>
  )
}
