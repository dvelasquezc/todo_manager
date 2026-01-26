'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { StatusFlowWeek } from '@/actions/analytics'

interface StatusFlowChartProps {
  data: StatusFlowWeek[]
}

const statusColors: Record<string, string> = {
  inbox: '#6b7280',
  today: '#3b82f6',
  next: '#8b5cf6',
  waiting: '#f59e0b',
  blocked: '#ef4444',
  someday: '#64748b',
}

const statusLabels: Record<string, string> = {
  inbox: 'Inbox',
  today: 'Today',
  next: 'Next',
  waiting: 'Waiting',
  blocked: 'Blocked',
  someday: 'Someday',
}

export function StatusFlowChart({ data }: StatusFlowChartProps) {
  const chartData = data.map((d) => ({
    week: formatWeekLabel(d.week),
    inbox: d.inbox,
    today: d.today,
    next: d.next,
    waiting: d.waiting,
    blocked: d.blocked,
    someday: d.someday,
  }))

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No status flow data yet
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
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
              statusLabels[name as string] || name,
            ]}
          />
          <Legend formatter={(value) => statusLabels[value] || value} />
          {Object.keys(statusColors).map((status) => (
            <Area
              key={status}
              type="monotone"
              dataKey={status}
              name={status}
              stackId="1"
              stroke={statusColors[status]}
              fill={statusColors[status]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
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
