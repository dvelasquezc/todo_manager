'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { ContextSwitchingDay } from '@/actions/analytics'

interface ContextSwitchingChartProps {
  data: ContextSwitchingDay[]
}

export function ContextSwitchingChart({ data }: ContextSwitchingChartProps) {
  const chartData = data.map((d) => ({
    day: formatDayLabel(d.day),
    projectCount: d.projectCount,
  }))

  // Calculate average for reference line
  const avgProjectCount = data.length > 0
    ? Math.round(data.reduce((acc, d) => acc + d.projectCount, 0) / data.length * 10) / 10
    : 0

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No context switching data yet. Start focus sessions to track.
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
            tickLine={false}
            className="text-muted-foreground"
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            allowDecimals={false}
            label={{ value: 'Projects', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value) => [
              `${value} project${value !== 1 ? 's' : ''}`,
              'Context Switches',
            ]}
          />
          <ReferenceLine
            y={avgProjectCount}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{
              value: `Avg: ${avgProjectCount}`,
              position: 'right',
              fill: '#f59e0b',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="projectCount"
            name="Projects Touched"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Lower is better - fewer context switches means more focused work
      </p>
    </div>
  )
}

function formatDayLabel(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
