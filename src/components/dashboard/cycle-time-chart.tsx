'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { CycleTimeByProject } from '@/actions/analytics'

interface CycleTimeChartProps {
  data: CycleTimeByProject[]
}

export function CycleTimeChart({ data }: CycleTimeChartProps) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.projectName.length > 12 ? d.projectName.slice(0, 10) + '...' : d.projectName,
    fullName: d.projectName,
    avgDays: d.avgDays,
    taskCount: d.taskCount,
    color: d.projectColor,
  }))

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
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            className="text-muted-foreground"
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            label={{ value: 'Days', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, _name, props) => {
              const item = props.payload
              return [
                `${value} days avg (${item.taskCount} task${item.taskCount !== 1 ? 's' : ''})`,
                item.fullName,
              ]
            }}
            labelFormatter={() => 'Cycle Time'}
          />
          <Bar dataKey="avgDays" name="Avg Days">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Average time from creation to completion by project
      </p>
    </div>
  )
}
