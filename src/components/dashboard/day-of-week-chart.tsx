'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DayOfWeekStats } from '@/actions/analytics'

interface DayOfWeekChartProps {
  data: DayOfWeekStats[]
}

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No productivity data yet
      </div>
    )
  }

  // Check if there's any data
  const hasData = data.some(d => d.avgHours > 0 || d.avgTasks > 0)
  if (!hasData) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No productivity data yet
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
            tickLine={false}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => {
              if (name === 'Avg Hours') return [`${value}h`, name]
              return [`${value} tasks`, name]
            }}
          />
          <Legend />
          <Bar
            dataKey="avgHours"
            name="Avg Hours"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="avgTasks"
            name="Avg Tasks"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
