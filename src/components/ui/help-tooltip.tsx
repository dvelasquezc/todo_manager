'use client'

import { HelpCircle } from 'lucide-react'

interface HelpTooltipProps {
  content: string
}

export function HelpTooltip({ content }: HelpTooltipProps) {
  return (
    <span className="relative inline-flex items-center group">
      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 text-xs text-popover-foreground bg-popover border rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 w-64 z-50 pointer-events-none">
        {content}
      </span>
    </span>
  )
}
