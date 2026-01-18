import { createClient } from '@/lib/supabase/server'
import { TaskCard } from '@/components/tasks/task-card'
import { QuickAdd } from '@/components/tasks/quick-add'
import { Inbox } from 'lucide-react'

export default async function InboxPage() {
  const supabase = await createClient()

  // Get all inbox tasks across all projects
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('status', 'inbox')
    .order('created_at', { ascending: false })

  // Get first project for quick add (default to first system project)
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order')
    .limit(1)

  const defaultProjectId = projects?.[0]?.id

  // Create a map of projects for the task cards
  const projectMap: Record<string, typeof projects[0]> = {}
  tasks?.forEach((task: { project: typeof projects[0] }) => {
    if (task.project) {
      projectMap[task.project.id] = task.project
    }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Inbox</h1>
        <span className="text-muted-foreground">
          {tasks?.length ?? 0} tasks
        </span>
      </div>

      {defaultProjectId && (
        <QuickAdd projectId={defaultProjectId} placeholder="Quick add to inbox..." />
      )}

      <div className="space-y-2">
        {tasks?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Your inbox is empty</p>
            <p className="text-sm">Add tasks using the input above</p>
          </div>
        ) : (
          tasks?.map((task: typeof tasks[0]) => (
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
