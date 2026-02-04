import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Header } from '@/components/layout/header'
import { TimezoneProvider } from '@/components/providers/timezone-provider'
import { AssistantProvider, AssistantPanel } from '@/components/ai-assistant'
import type { AIModel } from '@/types/ai'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's projects for the sidebar
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order')

  // Fetch user's profile for timezone and AI preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, ai_preferences')
    .eq('id', user.id)
    .single()

  // Get default AI model from preferences
  const defaultModel: AIModel = profile?.ai_preferences?.default_model || 'claude-opus-4-20250514'

  return (
    <TimezoneProvider timezone={profile?.timezone}>
      <AssistantProvider defaultModel={defaultModel}>
        <div className="min-h-screen bg-background">
          {/* Desktop sidebar */}
          <Sidebar projects={projects || []} />

          {/* Main content area */}
          <div className="md:pl-64 flex flex-col min-h-screen">
            <Header email={user.email} />

            <main className="flex-1 p-4 pb-20 md:pb-4">
              {children}
            </main>

            {/* Mobile bottom nav */}
            <MobileNav />
          </div>

          {/* AI Assistant Panel */}
          <AssistantPanel />
        </div>
      </AssistantProvider>
    </TimezoneProvider>
  )
}
