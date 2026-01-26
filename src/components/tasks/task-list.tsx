'use client'

import { memo, useState, useCallback } from 'react'
import { TaskCard } from './task-card'
import { TaskEditModal } from './task-edit-modal'
import type { Task, Project } from '@/types/database'

interface TaskListProps {
  tasks: Task[]
  projects?: Record<string, Project>
  showProject?: boolean
  emptyMessage?: string
}

export const TaskList = memo(function TaskList({
  tasks,
  projects,
  showProject = false,
  emptyMessage = 'No tasks'
}: TaskListProps) {
  // Shared modal state - single modal instance for all tasks
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task)
  }, [])

  const handleCloseModal = useCallback(() => {
    setEditingTask(null)
  }, [])

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            project={projects?.[task.project_id]}
            showProject={showProject}
            onEdit={handleEdit}
          />
        ))}
      </div>

      {/* Shared edit modal - single instance for all tasks */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          project={projects?.[editingTask.project_id]}
          open={true}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
})
