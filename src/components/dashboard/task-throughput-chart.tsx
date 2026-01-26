'use client'

import { useMemo } from 'react'
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
import type { TaskThroughputWeek } from '@/actions/analytics'

interface TaskThroughputChartProps {
  data: TaskThroughputWeek[]
}

export function TaskThroughputChart({ data }: TaskThroughputChartProps) {
  // Transform data for multi-line chart
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
        weekMap.set(d.week, { total: 0 })
      }
      const weekData = weekMap.get(d.week)!
      weekData[d.projectId] = d.completed
      weekData.total += d.completed
    }

    // Convert to array
    const chartData = Array.from(weekMap.entries()).map(([week, projectCounts]) => ({
      week: formatWeekLabel(week),
      ...projectCounts,
    }))

    return { chartData, projects }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No completed tasks yet
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
            allowDecimals={false}
            label={{ value: 'Tasks', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [
              `${value} task${value !== 1 ? 's' : ''}`,
              name === 'total' ? 'Total' : name,
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#6b7280"
            strokeWidth={3}
            dot={{ fill: '#6b7280', r: 4 }}
          />
          {projects.map((project) => (
            <Line
              key={project.id}
              type="monotone"
              dataKey={project.id}
              name={project.name}
              stroke={project.color}
              strokeWidth={2}
              dot={{ fill: project.color, r: 3 }}
              connectNulls
            />
          ))}
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
