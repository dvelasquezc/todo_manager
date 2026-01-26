'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronsUpDown, X, Link2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getAvailableBlockers } from '@/actions/tasks'

interface Task {
  id: string
  title: string
  status: string
  project_id: string
}

interface DependencySelectorProps {
  value: string | null
  onChange: (value: string | null) => void
  currentTaskId?: string
  projectId?: string
}

export function DependencySelector({ value, onChange, currentTaskId, projectId }: DependencySelectorProps) {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Load tasks - called when dropdown opens
  const loadTasks = useCallback(async (forceReload = false) => {
    if (hasLoaded && !forceReload) return // Use cache if available

    setLoading(true)
    const result = await getAvailableBlockers(currentTaskId, projectId)
    if (result.data) {
      setTasks(result.data)
      // Find the selected task if value is set
      if (value) {
        const found = result.data.find(t => t.id === value)
        setSelectedTask(found || null)
      }
    }
    setLoading(false)
    setHasLoaded(true)
  }, [currentTaskId, projectId, value, hasLoaded])

  // Load when dropdown opens (lazy loading)
  useEffect(() => {
    if (open && !hasLoaded) {
      loadTasks()
    }
  }, [open, hasLoaded, loadTasks])

  // No reset on project change - keep cache for faster experience
  // User can close and reopen dropdown if they need fresh data

  const handleSelect = (taskId: string) => {
    if (taskId === value) {
      onChange(null)
      setSelectedTask(null)
    } else {
      onChange(taskId)
      const task = tasks.find(t => t.id === taskId)
      setSelectedTask(task || null)
    }
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSelectedTask(null)
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={loading}
          >
            {selectedTask ? (
              <span className="flex items-center gap-2 truncate">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{selectedTask.title}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select blocking task...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tasks..." />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Loading tasks...</span>
                </div>
              ) : (
                <>
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup>
                {tasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.title}
                    onSelect={() => handleSelect(task.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === task.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{task.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">
                      {task.status}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-9 w-9 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// Compact badge for displaying blocker on task card
interface BlockerBadgeProps {
  blockerTitle: string
  blockerStatus: string
  onClick?: () => void
}

export function BlockerBadge({ blockerTitle, blockerStatus, onClick }: BlockerBadgeProps) {
  const isBlockerDone = blockerStatus === 'done'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
        isBlockerDone
          ? 'bg-green-100 text-green-700'
          : 'bg-orange-100 text-orange-700'
      )}
    >
      <Link2 className="h-3 w-3" />
      <span className="truncate max-w-[150px]">
        {isBlockerDone ? 'Unblocked: ' : 'Blocked by: '}
        {blockerTitle}
      </span>
    </button>
  )
}
