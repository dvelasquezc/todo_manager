'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Settings, User, Globe, Check, ChevronDown, Bot } from 'lucide-react'
import { getBrowserTimezone, COMMON_TIMEZONES, getAllTimezones, getTimezoneLabel } from '@/lib/timezone'
import { updateAIInstructions, updateAIPreferences } from '@/actions/profiles'
import type { AIModel } from '@/types/ai'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [timezoneDropdownOpen, setTimezoneDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // AI Settings state
  const [aiInstructions, setAiInstructions] = useState('')
  const [aiDefaultModel, setAiDefaultModel] = useState<AIModel>('claude-opus-4-20250514')
  const [savingAi, setSavingAi] = useState(false)
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const detectedTimezone = typeof window !== 'undefined' ? getBrowserTimezone() : 'America/Los_Angeles'

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || '')

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, timezone, ai_instructions, ai_preferences')
          .eq('id', user.id)
          .single()

        if (profile) {
          setDisplayName(profile.display_name || '')
          setTimezone(profile.timezone || getBrowserTimezone())
          setAiInstructions(profile.ai_instructions || '')
          if (profile.ai_preferences?.default_model) {
            setAiDefaultModel(profile.ai_preferences.default_model)
          }
        } else {
          setTimezone(getBrowserTimezone())
        }
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage({ type: 'error', text: 'Not authenticated' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        timezone: timezone,
      })
      .eq('id', user.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Settings saved' })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`p-3 text-sm rounded-md ${
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display Name
            </label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Timezone
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTimezoneDropdownOpen(!timezoneDropdownOpen)}
                className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span>{getTimezoneLabel(timezone)}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>

              {timezoneDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-1">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Detected: {getTimezoneLabel(detectedTimezone)}
                    </div>
                    {detectedTimezone !== timezone && (
                      <button
                        type="button"
                        onClick={() => {
                          setTimezone(detectedTimezone)
                          setTimezoneDropdownOpen(false)
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        Use detected timezone
                      </button>
                    )}
                    <div className="h-px bg-border my-1" />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Common Timezones
                    </div>
                    {COMMON_TIMEZONES.map((tz) => (
                      <button
                        key={tz.value}
                        type="button"
                        onClick={() => {
                          setTimezone(tz.value)
                          setTimezoneDropdownOpen(false)
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center justify-between"
                      >
                        <span>{tz.label}</span>
                        {timezone === tz.value && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                    <div className="h-px bg-border my-1" />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      All Timezones
                    </div>
                    {getAllTimezones()
                      .filter((tz) => !COMMON_TIMEZONES.some((c) => c.value === tz))
                      .map((tz) => (
                        <button
                          key={tz}
                          type="button"
                          onClick={() => {
                            setTimezone(tz)
                            setTimezoneDropdownOpen(false)
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center justify-between"
                        >
                          <span>{getTimezoneLabel(tz)}</span>
                          {timezone === tz && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Times will be displayed in this timezone
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant Settings
          </CardTitle>
          <CardDescription>Configure your AI productivity assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiMessage && (
            <div
              className={`p-3 text-sm rounded-md ${
                aiMessage.type === 'success'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {aiMessage.text}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="aiInstructions" className="text-sm font-medium">
              AI Instructions
            </label>
            <Textarea
              id="aiInstructions"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Add context for the AI assistant to always know about...

Examples:
- I teach on Tuesdays so I won't log hours that day
- My research project has a grant deadline in March
- I prefer to do deep work in the mornings"
              rows={6}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {aiInstructions.length}/2000 characters. This context is included in every AI conversation.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default AI Model</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAiDefaultModel('claude-opus-4-20250514')}
                className={`flex-1 p-3 border rounded-lg text-left transition-colors ${
                  aiDefaultModel === 'claude-opus-4-20250514'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <p className="font-medium text-sm">Opus</p>
                <p className="text-xs text-muted-foreground">Best for deep analysis</p>
              </button>
              <button
                type="button"
                onClick={() => setAiDefaultModel('claude-sonnet-4-20250514')}
                className={`flex-1 p-3 border rounded-lg text-left transition-colors ${
                  aiDefaultModel === 'claude-sonnet-4-20250514'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <p className="font-medium text-sm">Sonnet</p>
                <p className="text-xs text-muted-foreground">Fast & efficient</p>
              </button>
            </div>
          </div>

          <Button
            onClick={async () => {
              setSavingAi(true)
              setAiMessage(null)

              const [instructionsResult, prefsResult] = await Promise.all([
                updateAIInstructions({ instructions: aiInstructions || null }),
                updateAIPreferences({ default_model: aiDefaultModel }),
              ])

              if (instructionsResult.error || prefsResult.error) {
                setAiMessage({
                  type: 'error',
                  text: instructionsResult.error || prefsResult.error || 'Failed to save',
                })
              } else {
                setAiMessage({ type: 'success', text: 'AI settings saved' })
              }

              setSavingAi(false)
            }}
            disabled={savingAi}
          >
            {savingAi ? 'Saving...' : 'Save AI Settings'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Todo List Manager</strong> v3.0.0</p>
          <p>A cloud-synced task manager with AI productivity assistant.</p>
          <p>Features: Projects, Tasks, Calendar, Dashboard, AI Assistant, Brain Dump.</p>
        </CardContent>
      </Card>
    </div>
  )
}
