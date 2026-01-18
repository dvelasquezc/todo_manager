'use client'

import { TaskCard } from './task-card'
import type { Task, Project } from '@/types/database'

interface TaskListProps {
  tasks: Task[]
  projects?: Record<string, Project>
  showProject?: boolean
  emptyMessage?: string
}

export function TaskList({
  tasks,
  projects,
  showProject = false,
  emptyMessage = 'No tasks'
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          project={projects?.[task.project_id]}
          showProject={showProject}
        />
      ))}
    </div>
  )
}
