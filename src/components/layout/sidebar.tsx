'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Inbox, Sun, Calendar, Archive, Settings, Plus, FolderKanban } from 'lucide-react'
import type { Project } from '@/types/database'

interface SidebarProps {
  projects: Project[]
}

export function Sidebar({ projects }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/today', label: 'Today', icon: Sun },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
  ]

  const systemProjects = projects.filter(p => p.is_system)
  const customProjects = projects.filter(p => !p.is_system && !p.is_archived)

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-muted/30 border-r">
      <div className="flex flex-col flex-1 min-h-0 pt-5 pb-4">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4 mb-6">
          <FolderKanban className="h-8 w-8 text-primary" />
          <span className="ml-2 text-xl font-bold">Todo Manager</span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            )
          })}

          {/* System Projects */}
          <div className="pt-4">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projects
            </h3>
            <div className="mt-2 space-y-1">
              {systemProjects.map((project) => {
                const href = `/projects/${project.slug}`
                const isActive = pathname === href
                return (
                  <Link
                    key={project.id}
                    href={href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span
                      className="mr-3 h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Custom Projects */}
          {customProjects.length > 0 && (
            <div className="pt-4">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Research
              </h3>
              <div className="mt-2 space-y-1">
                {customProjects.map((project) => {
                  const href = `/projects/${project.slug}`
                  const isActive = pathname === href
                  return (
                    <Link
                      key={project.id}
                      href={href}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <span
                        className="mr-3 h-3 w-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add Project Button */}
          <div className="pt-2">
            <Link
              href="/projects/new"
              className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              <Plus className="mr-3 h-5 w-5" />
              New Project
            </Link>
          </div>
        </nav>

        {/* Bottom nav */}
        <div className="flex-shrink-0 px-2 space-y-1">
          <Link
            href="/archive"
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              pathname === '/archive'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Archive className="mr-3 h-5 w-5" />
            Archive
          </Link>
          <Link
            href="/settings"
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              pathname === '/settings'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </Link>
        </div>
      </div>
    </aside>
  )
}
