'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Loader2, Trash2, Check, Edit2, Mic, MicOff, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EnergySelector } from '@/components/ui/energy-selector'
import { parseBrainDump, confirmBrainDump } from '@/actions/brain-dump'
import { getProjects } from '@/actions/projects'
import type { Project } from '@/types/database'
import type { EnergyLevel } from '@/types/database'

interface ParsedTask {
  title: string
  notes: string | null
  project_id: string
  start_date: string | null
  due_date: string | null
  estimate_hours: number | null
  priority: '1' | '2' | '3' | '4'
  energy_level: EnergyLevel | null
}

interface BrainDumpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultProjectId?: string
}

export function BrainDumpModal({ open, onOpenChange, defaultProjectId }: BrainDumpModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input')
  const [input, setInput] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setVoiceSupported(!!SpeechRecognition)
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      // Append to existing input with a space
      setInput(prev => {
        const trimmed = prev.trim()
        return trimmed ? trimmed + ' ' + transcript : transcript
      })
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      const result = await getProjects()
      if (result.data) {
        setProjects(result.data)
        if (!selectedProjectId && result.data.length > 0) {
          // Select first non-system project or first project
          const defaultProj = result.data.find(p => !p.is_system) || result.data[0]
          setSelectedProjectId(defaultProj.id)
        }
      }
    }
    if (open) {
      loadProjects()
    }
  }, [open, selectedProjectId])

  const handleParse = async () => {
    if (!input.trim() || !selectedProjectId) return

    setLoading(true)
    setError(null)

    const result = await parseBrainDump({
      input: input.trim(),
      default_project_id: selectedProjectId,
    })

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setSessionId(result.data.session_id)
      setParsedTasks(result.data.tasks)
      setSelectedTasks(new Set(result.data.tasks.map((_, i) => i)))
      setStep('preview')
    }

    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!sessionId) return

    const tasksToCreate = parsedTasks.filter((_, i) => selectedTasks.has(i))
    if (tasksToCreate.length === 0) {
      setError('Select at least one task to create')
      return
    }

    setLoading(true)
    setError(null)

    const result = await confirmBrainDump({
      session_id: sessionId,
      tasks: tasksToCreate,
    })

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      // Success - close modal
      handleClose()
    }

    setLoading(false)
  }

  const handleClose = () => {
    setStep('input')
    setInput('')
    setError(null)
    setSessionId(null)
    setParsedTasks([])
    setSelectedTasks(new Set())
    setEditingIndex(null)
    onOpenChange(false)
  }

  const toggleTask = (index: number) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  const updateTask = (index: number, updates: Partial<ParsedTask>) => {
    const newTasks = [...parsedTasks]
    newTasks[index] = { ...newTasks[index], ...updates }
    setParsedTasks(newTasks)
  }

  const removeTask = (index: number) => {
    const newTasks = parsedTasks.filter((_, i) => i !== index)
    setParsedTasks(newTasks)
    const newSelected = new Set([...selectedTasks].filter(i => i !== index).map(i => i > index ? i - 1 : i))
    setSelectedTasks(newSelected)
  }

  const priorityLabels: Record<string, string> = {
    '1': 'Urgent',
    '2': 'High',
    '3': 'Normal',
    '4': 'Low',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Brain Dump
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'Paste your tasks, notes, or ideas. AI will structure them into tasks.'
              : `Found ${parsedTasks.length} tasks. Review and edit before creating.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {step === 'input' ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block text-slate-700 dark:text-slate-200">Default Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your Tasks</label>
                {voiceSupported && (
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className="gap-2"
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-3 w-3 fill-current" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3" />
                        Voice Input
                      </>
                    )}
                  </Button>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 p-2 mb-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Listening... Speak your tasks clearly.
                </div>
              )}
              <Textarea
                placeholder="Write or speak your tasks here...

Examples:
- Review the quarterly report by Friday, should take about 2 hours
- Meeting with Sarah tomorrow at 3pm
- ASAP: Fix the login bug
- Research new frameworks for the Teaching project, low priority
- Call mom sometime this week"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={10}
                className="resize-none bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-muted-foreground">
                  {input.length}/10000 characters
                </p>
                {!voiceSupported && (
                  <p className="text-xs text-muted-foreground">
                    Voice input not supported in this browser
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 py-2 bg-slate-100 dark:bg-slate-800 -mx-6 px-6 rounded-lg">
            {parsedTasks.map((task, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-4 transition-all shadow ${
                  selectedTasks.has(index)
                    ? 'border-blue-600 bg-blue-100 dark:bg-blue-900 text-slate-900 dark:text-slate-100'
                    : 'border-slate-400 bg-white dark:bg-slate-700 hover:border-slate-500 text-slate-800 dark:text-slate-200'
                }`}
              >
                {editingIndex === index ? (
                  <div className="space-y-3">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(index, { title: e.target.value })}
                      placeholder="Task title"
                    />
                    <Textarea
                      value={task.notes || ''}
                      onChange={(e) => updateTask(index, { notes: e.target.value || null })}
                      placeholder="Notes (optional)"
                      rows={2}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Select
                        value={task.project_id}
                        onValueChange={(v) => updateTask(index, { project_id: v })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={task.priority}
                        onValueChange={(v) => updateTask(index, { priority: v as '1' | '2' | '3' | '4' })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={task.due_date || ''}
                        onChange={(e) => updateTask(index, { due_date: e.target.value || null })}
                        className="w-[150px]"
                        placeholder="Due date"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Energy:</span>
                      <EnergySelector
                        value={task.energy_level}
                        onChange={(v) => updateTask(index, { energy_level: v })}
                        size="sm"
                      />
                    </div>
                    <Button size="sm" onClick={() => setEditingIndex(null)}>
                      Done Editing
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTask(index)}
                      className={`mt-0.5 h-6 w-6 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedTasks.has(index)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-500 bg-white dark:bg-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {selectedTasks.has(index) && <Check className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                      {task.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                          {task.notes}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs font-medium">
                        <span
                          className="px-2 py-1 rounded-full border"
                          style={{
                            backgroundColor: projects.find(p => p.id === task.project_id)?.color + '30',
                            borderColor: projects.find(p => p.id === task.project_id)?.color,
                            color: projects.find(p => p.id === task.project_id)?.color,
                          }}
                        >
                          {projects.find(p => p.id === task.project_id)?.name || 'Unknown'}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-500">
                          {priorityLabels[task.priority]}
                        </span>
                        {task.due_date && (
                          <span className="px-2 py-1 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-100 border border-orange-300 dark:border-orange-700">
                            Due: {task.due_date}
                          </span>
                        )}
                        {task.estimate_hours && (
                          <span className="px-2 py-1 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100 border border-purple-300 dark:border-purple-700">
                            ~{task.estimate_hours}h
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingIndex(index)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeTask(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={loading || input.length < 10 || !selectedProjectId}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Parse Tasks
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || selectedTasks.size === 0}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
