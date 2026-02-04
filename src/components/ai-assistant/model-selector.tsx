'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AIModel } from '@/types/ai'

interface ModelSelectorProps {
  value: AIModel
  onChange: (value: AIModel) => void
  disabled?: boolean
}

const modelLabels: Record<AIModel, string> = {
  'claude-opus-4-20250514': 'Opus',
  'claude-sonnet-4-20250514': 'Sonnet',
}

const modelDescriptions: Record<AIModel, string> = {
  'claude-opus-4-20250514': 'Best for analysis',
  'claude-sonnet-4-20250514': 'Fast & efficient',
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AIModel)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[100px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="claude-opus-4-20250514">
          <div className="flex flex-col">
            <span className="font-medium">{modelLabels['claude-opus-4-20250514']}</span>
            <span className="text-xs text-muted-foreground">
              {modelDescriptions['claude-opus-4-20250514']}
            </span>
          </div>
        </SelectItem>
        <SelectItem value="claude-sonnet-4-20250514">
          <div className="flex flex-col">
            <span className="font-medium">{modelLabels['claude-sonnet-4-20250514']}</span>
            <span className="text-xs text-muted-foreground">
              {modelDescriptions['claude-sonnet-4-20250514']}
            </span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
