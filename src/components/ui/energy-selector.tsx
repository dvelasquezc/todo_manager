'use client'

import { cn } from '@/lib/utils'
import { Battery, BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react'
import type { EnergyLevel } from '@/types/database'

interface EnergySelectorProps {
  value: EnergyLevel | null
  onChange: (value: EnergyLevel | null) => void
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const energyOptions: { value: EnergyLevel; label: string; color: string; icon: typeof Battery }[] = [
  { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100 hover:bg-green-200 border-green-300', icon: BatteryLow },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200 border-yellow-300', icon: BatteryMedium },
  { value: 'high', label: 'High', color: 'text-red-600 bg-red-100 hover:bg-red-200 border-red-300', icon: BatteryFull },
]

export function EnergySelector({ value, onChange, size = 'md', showLabel = true }: EnergySelectorProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const buttonPadding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5'
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className="flex gap-1">
      {energyOptions.map((option) => {
        const isSelected = value === option.value
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(isSelected ? null : option.value)}
            className={cn(
              'flex items-center gap-1 rounded-md border transition-colors',
              buttonPadding,
              fontSize,
              isSelected
                ? option.color
                : 'text-muted-foreground bg-background hover:bg-muted border-input'
            )}
          >
            <Icon className={iconSize} />
            {showLabel && <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Compact indicator for task cards
export function EnergyIndicator({ energy }: { energy: EnergyLevel | null }) {
  if (!energy) return null

  const option = energyOptions.find(o => o.value === energy)
  if (!option) return null

  const Icon = option.icon
  const colorClass = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  }[energy]

  return (
    <span className={cn('flex items-center gap-0.5', colorClass)} title={`${option.label} energy`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}
