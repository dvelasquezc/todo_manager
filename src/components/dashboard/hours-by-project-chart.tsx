'use client'

import { useMemo } from 'react'
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
import type { HoursByProjectWeek } from '@/actions/analytics'

interface HoursByProjectChartProps {
  data: HoursByProjectWeek[]
}

export function HoursByProjectChart({ data }: HoursByProjectChartProps) {
  // Transform data for stacked bar chart
  const { chartData, projects } = useMemo(() => {
    // Get unique projects
    const projectSet = new Map<string, { name: string; color: string }>()
    for (const d of data) {
      projectSet.set(d.projectId, { name: d.projectName, color: d.projectColor })
    }
    const projects = Array.from(projectSet.entries()).map(([id, info]) => ({
      id,
      ...info,
    }))

    // Group by week
    const weekMap = new Map<string, Record<string, number>>()
    for (const d of data) {
      if (!weekMap.has(d.week)) {
        weekMap.set(d.week, {})
      }
      weekMap.get(d.week)![d.projectId] = Math.round(d.minutes / 60 * 10) / 10
    }

    // Convert to array
    const chartData = Array.from(weekMap.entries()).map(([week, projectHours]) => ({
      week: formatWeekLabel(week),
      ...projectHours,
    }))

    return { chartData, projects }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No focus session data yet
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
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
            formatter={(value) => [`${value}h`, '']}
          />
          <Legend />
          {projects.map((project) => (
            <Bar
              key={project.id}
              dataKey={project.id}
              name={project.name}
              stackId="hours"
              fill={project.color}
            />
          ))}
        </BarChart>
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
