'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { updateProject, deleteProject } from '@/actions/projects'
import { Trash2, Loader2, Star } from 'lucide-react'
import type { Project } from '@/types/database'

interface ProjectEditModalProps {
  project: Project
  open: boolean
  onClose: () => void
}

const colorOptions = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280', // gray
]

export function ProjectEditModal({ project, open, onClose }: ProjectEditModalProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [color, setColor] = useState(project.color)
  const [isFocused, setIsFocused] = useState(project.is_focused ?? false)

  // Reset form when project changes
  useEffect(() => {
    setName(project.name)
    setDescription(project.description || '')
    setColor(project.color)
    setIsFocused(project.is_focused ?? false)
  }, [project])

  const handleSave = async () => {
    if (!name.trim()) return

    setSaving(true)
    const result = await updateProject(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      color,
      is_focused: isFocused,
    })
    setSaving(false)

    if (!result.error) {
      router.refresh()
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? All tasks in this project will also be deleted.')) return

    setDeleting(true)
    const result = await deleteProject(project.id)
    setDeleting(false)

    if (!result.error) {
      onClose()
      router.push('/projects')
    } else {
      alert(result.error)
    }
  }

  const isSystemProject = project.is_system

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSystemProject ? 'Project Settings' : 'Edit Project'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name - only editable for non-system projects */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name {!isSystemProject && <span className="text-destructive">*</span>}
            </label>
            {isSystemProject ? (
              <p className="text-sm text-muted-foreground">{project.name}</p>
            ) : (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Focus toggle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Focus</label>
            <button
              type="button"
              onClick={() => setIsFocused(!isFocused)}
              className="flex items-center gap-2 text-sm"
            >
              <Star
                className={`w-5 h-5 ${isFocused ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
              />
              <span className="text-muted-foreground">
                {isFocused ? 'Focused for upcoming weeks' : 'Mark as focus project'}
              </span>
            </button>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {!isSystemProject ? (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          ) : (
            <div /> // Spacer for system projects
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={(!isSystemProject && !name.trim()) || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
