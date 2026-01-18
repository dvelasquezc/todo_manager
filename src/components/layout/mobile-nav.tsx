'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Inbox, Sun, Calendar, FolderKanban, Archive } from 'lucide-react'

export function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/today', label: 'Today', icon: Sun },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
