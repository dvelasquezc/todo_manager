import { createClient } from '@/lib/supabase/server'
import { TaskList } from '@/components/tasks/task-list'
import { Ban, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { Project } from '@/types/database'

const PAGE_SIZE = 30

interface BlockedPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function BlockedPage({ searchParams }: BlockedPageProps) {
  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE

  const supabase = await createClient()

  // Get blocked tasks with pagination
  const { data: tasks, count } = await supabase
    .from('tasks')
    .select('*, project:projects(*)', { count: 'exact' })
    .eq('status', 'blocked')
    .order('sort_order', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  // Create a map of projects for the task cards
  const projectMap: Record<string, Project> = {}
  tasks?.forEach((task: { project: Project }) => {
    if (task.project) {
      projectMap[task.project.id] = task.project
    }
  })

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)
  const hasPrevPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Ban className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Blocked</h1>
        <span className="text-muted-foreground">
          {count ?? 0} tasks
        </span>
      </div>

      {tasks?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No blocked tasks</p>
          <p className="text-sm">Tasks blocked by dependencies will appear here</p>
        </div>
      ) : (
        <TaskList
          tasks={tasks || []}
          projects={projectMap}
          showProject
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {hasPrevPage ? (
            <Link
              href={`/blocked?page=${currentPage - 1}`}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </span>
          )}

          <span className="px-3 py-2 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          {hasNextPage ? (
            <Link
              href={`/blocked?page=${currentPage + 1}`}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground">
              Next
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
