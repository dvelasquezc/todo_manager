'use client'

import { createContext, useContext, ReactNode } from 'react'
import { getBrowserTimezone } from '@/lib/timezone'

interface TimezoneContextValue {
  timezone: string
}

const TimezoneContext = createContext<TimezoneContextValue>({
  timezone: 'America/Los_Angeles',
})

interface TimezoneProviderProps {
  children: ReactNode
  timezone?: string | null
}

export function TimezoneProvider({ children, timezone }: TimezoneProviderProps) {
  // Use provided timezone, fall back to browser detection, then default
  const resolvedTimezone = timezone || getBrowserTimezone()

  return (
    <TimezoneContext.Provider value={{ timezone: resolvedTimezone }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone(): string {
  const context = useContext(TimezoneContext)
  return context.timezone
}
