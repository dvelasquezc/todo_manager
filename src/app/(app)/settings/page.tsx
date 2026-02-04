'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Settings, User, Globe, Check, ChevronDown } from 'lucide-react'
import { getBrowserTimezone, COMMON_TIMEZONES, getAllTimezones, getTimezoneLabel } from '@/lib/timezone'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [timezoneDropdownOpen, setTimezoneDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const detectedTimezone = typeof window !== 'undefined' ? getBrowserTimezone() : 'America/Los_Angeles'

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || '')

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, timezone')
          .eq('id', user.id)
          .single()

        if (profile) {
          setDisplayName(profile.display_name || '')
          setTimezone(profile.timezone || getBrowserTimezone())
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
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Todo List Manager</strong> v1.0.0</p>
          <p>A cloud-synced task manager across projects.</p>
          <p>Features: Projects, Tasks with status lanes, Done archive, Activity logging.</p>
        </CardContent>
      </Card>
    </div>
  )
}
