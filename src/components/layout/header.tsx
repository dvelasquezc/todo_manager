'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, FolderKanban } from 'lucide-react'

interface HeaderProps {
  email?: string
  onMenuClick?: () => void
}

export function Header({ email, onMenuClick }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-background border-b">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-accent"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Mobile logo */}
        <div className="md:hidden flex items-center">
          <FolderKanban className="h-6 w-6 text-primary" />
          <span className="ml-2 font-bold">Todo</span>
        </div>

        {/* Desktop spacer */}
        <div className="hidden md:block" />

        {/* User info */}
        <div className="flex items-center gap-4">
          {email && (
            <span className="hidden sm:block text-sm text-muted-foreground">
              {email}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
