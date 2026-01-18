import { createClient } from '@/lib/supabase/server'
import { TaskCard } from '@/components/tasks/task-card'
import { Sun } from 'lucide-react'

export default async function TodayPage() {
  const supabase = await createClient()

  // Get all today tasks across all projects
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('status', 'today')
    .order('sort_order')

  // Create a map of projects for the task cards
  const projectMap: Record<string, (typeof tasks)[0]['project']> = {}
  tasks?.forEach((task) => {
    if (task.project) {
      projectMap[task.project.id] = task.project
    }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Sun className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">Today</h1>
        <span className="text-muted-foreground">
          {tasks?.length ?? 0} tasks
        </span>
      </div>

      <div className="space-y-2">
        {tasks?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sun className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tasks for today</p>
            <p className="text-sm">Move tasks to Today from your projects or inbox</p>
          </div>
        ) : (
          tasks?.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              project={projectMap[task.project_id]}
              showProject
            />
          ))
        )}
      </div>
    </div>
  )
}
