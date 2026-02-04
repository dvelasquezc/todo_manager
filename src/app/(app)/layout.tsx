import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Header } from '@/components/layout/header'
import { TimezoneProvider } from '@/components/providers/timezone-provider'

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

  // Fetch user's profile for timezone
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single()

  return (
    <TimezoneProvider timezone={profile?.timezone}>
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
      </div>
    </TimezoneProvider>
  )
}
