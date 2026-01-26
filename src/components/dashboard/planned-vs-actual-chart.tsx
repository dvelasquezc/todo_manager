'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PlannedVsActualWeek } from '@/actions/analytics'

interface PlannedVsActualChartProps {
  data: PlannedVsActualWeek[]
}

export function PlannedVsActualChart({ data }: PlannedVsActualChartProps) {
  const chartData = data.map((d) => ({
    week: formatWeekLabel(d.week),
    estimated: d.estimated,
    actual: d.actual,
    diff: Math.round((d.actual - d.estimated) * 10) / 10,
  }))

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No estimate data yet. Add time estimates to tasks.
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12 }}
            tickLine={false}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [
              `${value}h`,
              name === 'estimated' ? 'Estimated' : 'Actual',
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="estimated"
            name="Estimated"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#3b82f6', r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatWeekLabel(isoDate: string): string {
  const startDate = new Date(isoDate + 'T12:00:00')
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const startDay = startDate.getDate()
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const endDay = endDate.getDate()

  // Same month: "Jan 10-16"
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`
  }
  // Different months: "Jan 27-Feb 2"
  return `${startMonth} ${startDay}-${endMonth} ${endDay}`
}
