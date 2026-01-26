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
  Cell,
} from 'recharts'
import type { WipAgingData } from '@/actions/analytics'

interface WipAgingChartProps {
  data: WipAgingData[]
}

const statusLabels: Record<string, string> = {
  inbox: 'Inbox',
  today: 'Today',
  next: 'Next',
  waiting: 'Waiting',
  blocked: 'Blocked',
  someday: 'Someday',
}

const statusColors: Record<string, string> = {
  inbox: '#6b7280',
  today: '#3b82f6',
  next: '#8b5cf6',
  waiting: '#f59e0b',
  blocked: '#ef4444',
  someday: '#64748b',
}

export function WipAgingChart({ data }: WipAgingChartProps) {
  const chartData = data.map((d) => ({
    status: statusLabels[d.status] || d.status,
    statusKey: d.status,
    fresh: d.count - d.aging7d,
    '7-14d': d.aging7d - d.aging14d,
    '14-30d': d.aging14d - d.aging30d,
    '30d+': d.aging30d,
    total: d.count,
  }))

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No work in progress
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={false}
            className="text-muted-foreground"
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="status"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [
              `${value} task${value !== 1 ? 's' : ''}`,
              name === 'fresh' ? 'Fresh (<7d)' : name,
            ]}
          />
          <Legend />
          <Bar dataKey="fresh" name="Fresh (<7d)" stackId="aging" fill="#10b981" />
          <Bar dataKey="7-14d" name="7-14 days" stackId="aging" fill="#f59e0b" />
          <Bar dataKey="14-30d" name="14-30 days" stackId="aging" fill="#f97316" />
          <Bar dataKey="30d+" name="30+ days" stackId="aging" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Task age based on last update. Older tasks may need attention.
      </p>
    </div>
  )
}
