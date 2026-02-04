// Timezone utility functions using native Intl.DateTimeFormat

const DEFAULT_TIMEZONE = 'America/Los_Angeles'

/**
 * Get user's timezone with fallback to browser detection or default
 */
export function getUserTimezone(profileTimezone?: string | null): string {
  if (profileTimezone) return profileTimezone

  // Try to detect browser timezone
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Get the browser's detected timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Format a UTC timestamp for display in user's timezone
 * @param utcDateTime - ISO string in UTC (e.g., "2026-01-27T07:00:00.000Z")
 * @param timezone - IANA timezone identifier (e.g., "America/Los_Angeles")
 * @param options - Intl.DateTimeFormat options
 */
export function formatInTimezone(
  utcDateTime: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = new Date(utcDateTime)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options,
  }).format(date)
}

/**
 * Format a UTC timestamp with common presets
 */
export function formatDateTime(utcDateTime: string, timezone: string): string {
  return formatInTimezone(utcDateTime, timezone, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(utcDateTime: string, timezone: string): string {
  return formatInTimezone(utcDateTime, timezone, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateLong(utcDateTime: string, timezone: string): string {
  return formatInTimezone(utcDateTime, timezone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(utcDateTime: string, timezone: string): string {
  return formatInTimezone(utcDateTime, timezone, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get date string (yyyy-MM-dd) in user's timezone from UTC timestamp
 * This is critical for grouping tasks by day in the user's local timezone
 */
export function getLocalDateString(utcDateTime: string, timezone: string): string {
  const date = new Date(utcDateTime)

  // Get date parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  // en-CA format is yyyy-MM-dd
  return formatter.format(date)
}

/**
 * Get the day of week (1-7, Monday=1) for a UTC timestamp in user's timezone
 */
export function getLocalDayOfWeek(utcDateTime: string, timezone: string): number {
  const date = new Date(utcDateTime)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  })

  const dayName = formatter.format(date)
  const dayMap: Record<string, number> = {
    'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7
  }

  return dayMap[dayName] || 1
}

/**
 * Convert a local date string to UTC boundaries for database queries
 * @param localDate - Date string in yyyy-MM-dd format (in user's timezone)
 * @param timezone - User's timezone
 * @returns Object with start and end ISO strings in UTC
 */
export function getUTCBoundariesForLocalDate(
  localDate: string,
  timezone: string
): { startUTC: string; endUTC: string } {
  // Parse the local date parts
  const [year, month, day] = localDate.split('-').map(Number)

  // Create date at start of day in the target timezone
  // We use a workaround: create the date and adjust based on timezone offset
  const startLocal = new Date(`${localDate}T00:00:00`)
  const endLocal = new Date(`${localDate}T23:59:59.999`)

  // Get the offset for this timezone at this date
  const getOffset = (date: Date) => {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    return (utcDate.getTime() - tzDate.getTime())
  }

  const startOffset = getOffset(startLocal)
  const endOffset = getOffset(endLocal)

  const startUTC = new Date(startLocal.getTime() + startOffset)
  const endUTC = new Date(endLocal.getTime() + endOffset)

  return {
    startUTC: startUTC.toISOString(),
    endUTC: endUTC.toISOString(),
  }
}

/**
 * Check if two UTC timestamps are on the same day in the given timezone
 */
export function isSameLocalDay(
  utcDateTime1: string,
  utcDateTime2: string,
  timezone: string
): boolean {
  return getLocalDateString(utcDateTime1, timezone) === getLocalDateString(utcDateTime2, timezone)
}

/**
 * Common timezone options for the settings dropdown
 */
export const COMMON_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

/**
 * Get all available timezones (for full list in settings)
 */
export function getAllTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    // Fallback for older browsers
    return COMMON_TIMEZONES.map(tz => tz.value)
  }
}

/**
 * Get a human-readable label for a timezone
 */
export function getTimezoneLabel(timezone: string): string {
  const common = COMMON_TIMEZONES.find(tz => tz.value === timezone)
  if (common) return common.label

  // Format the timezone name nicely
  return timezone.replace(/_/g, ' ').replace(/\//g, ' / ')
}
