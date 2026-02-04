'use client'

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea'
  data: {
    labels: string[]
    datasets: Array<{
      label?: string
      data: number[]
      backgroundColor?: string | string[]
      borderColor?: string | string[]
      borderWidth?: number
      fill?: boolean
      tension?: number
    }>
  }
  options?: Record<string, unknown>
}

interface ChartRendererProps {
  config: ChartConfig
}

export function ChartRenderer({ config }: ChartRendererProps) {
  const chartRef = useRef<ChartJS>(null)

  // Default options for better appearance
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
        },
      },
    },
    scales: config.type === 'bar' || config.type === 'line' ? {
      y: {
        beginAtZero: true,
      },
    } : undefined,
  }

  const mergedOptions = {
    ...defaultOptions,
    ...config.options,
    plugins: {
      ...defaultOptions.plugins,
      ...(config.options?.plugins as Record<string, unknown> || {}),
    },
  }

  return (
    <div className="w-full max-w-md mx-auto my-4 p-4 bg-white rounded-lg border">
      <Chart
        ref={chartRef}
        type={config.type}
        data={config.data}
        options={mergedOptions}
      />
    </div>
  )
}

/**
 * Parse a chartjs code block from AI response text.
 * Returns the chart config if found, null otherwise.
 */
export function parseChartBlock(text: string): { config: ChartConfig; beforeText: string; afterText: string } | null {
  const chartRegex = /```chartjs\n([\s\S]*?)```/
  const match = text.match(chartRegex)

  if (!match) return null

  try {
    const config = JSON.parse(match[1]) as ChartConfig

    // Validate required fields
    if (!config.type || !config.data || !config.data.labels || !config.data.datasets) {
      return null
    }

    const beforeText = text.slice(0, match.index)
    const afterText = text.slice(match.index! + match[0].length)

    return { config, beforeText, afterText }
  } catch {
    console.error('Failed to parse chart config:', match[1])
    return null
  }
}

/**
 * Parse multiple chart blocks from text.
 * Returns an array of text segments and chart configs.
 */
export function parseAllChartBlocks(text: string): Array<{ type: 'text'; content: string } | { type: 'chart'; config: ChartConfig }> {
  const result: Array<{ type: 'text'; content: string } | { type: 'chart'; config: ChartConfig }> = []
  const chartRegex = /```chartjs\n([\s\S]*?)```/g

  let lastIndex = 0
  let match

  while ((match = chartRegex.exec(text)) !== null) {
    // Add text before the chart
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim()
      if (textContent) {
        result.push({ type: 'text', content: textContent })
      }
    }

    // Try to parse the chart
    try {
      const config = JSON.parse(match[1]) as ChartConfig
      if (config.type && config.data && config.data.labels && config.data.datasets) {
        result.push({ type: 'chart', config })
      }
    } catch {
      // If parsing fails, include the raw block as text
      result.push({ type: 'text', content: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last chart
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex).trim()
    if (textContent) {
      result.push({ type: 'text', content: textContent })
    }
  }

  // If no charts found, return the entire text
  if (result.length === 0 && text.trim()) {
    result.push({ type: 'text', content: text })
  }

  return result
}
