'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DeepWorkWeek } from '@/actions/analytics'

interface DeepWorkChartProps {
  data: DeepWorkWeek[]
}

export function DeepWorkChart({ data }: DeepWorkChartProps) {
  const chartData = data.map((d) => ({
    week: formatWeekLabel(d.week),
    deepWorkPercent: d.deepWorkPercent,
    deepHours: Math.round(d.deepMinutes / 60 * 10) / 10,
    totalHours: Math.round(d.totalMinutes / 60 * 10) / 10,
  }))

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No deep work data yet. Mark tasks as &quot;high energy&quot; to track.
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="deepWorkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            domain={[0, 100]}
            label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 12 }}
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
                `${value}% (${item.deepHours}h / ${item.totalHours}h)`,
                'Deep Work',
              ]
            }}
          />
          <Area
            type="monotone"
            dataKey="deepWorkPercent"
            name="Deep Work %"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#deepWorkGradient)"
          />
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
