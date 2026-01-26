'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { EstimateCalibrationPoint } from '@/actions/analytics'

interface EstimateCalibrationChartProps {
  data: EstimateCalibrationPoint[]
}

export function EstimateCalibrationChart({ data }: EstimateCalibrationChartProps) {
  // Calculate max value for domain
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.estimateHours, d.actualHours)),
    4
  )
  const domainMax = Math.ceil(maxValue * 1.1)

  // Calculate bias statistics
  const biasStats = data.length > 0
    ? calculateBias(data)
    : null

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No calibration data yet. Complete tasks with estimates to see accuracy.
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            dataKey="estimateHours"
            name="Estimated"
            domain={[0, domainMax]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            className="text-muted-foreground"
            label={{ value: 'Estimated (h)', position: 'bottom', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="actualHours"
            name="Actual"
            domain={[0, domainMax]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            label={{ value: 'Actual (h)', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          {/* Perfect estimation line */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: domainMax, y: domainMax },
            ]}
            stroke="#888888"
            strokeDasharray="5 5"
            label={{
              value: 'Perfect',
              position: 'insideTopRight',
              fill: '#888888',
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [
              `${value}h`,
              name === 'estimateHours' ? 'Estimated' : 'Actual',
            ]}
            labelFormatter={(_, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.title
              }
              return ''
            }}
          />
          <Scatter
            name="Tasks"
            data={data}
            fill="#8b5cf6"
          />
        </ScatterChart>
      </ResponsiveContainer>
      {biasStats && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {biasStats.bias > 0
            ? `You tend to underestimate by ${biasStats.bias}h on average`
            : biasStats.bias < 0
              ? `You tend to overestimate by ${Math.abs(biasStats.bias)}h on average`
              : 'Your estimates are well calibrated!'
          }
          {' '}(r² = {biasStats.r2})
        </p>
      )}
    </div>
  )
}

function calculateBias(data: EstimateCalibrationPoint[]) {
  const n = data.length
  if (n === 0) return { bias: 0, r2: 0 }

  // Calculate average bias
  const totalBias = data.reduce((acc, d) => acc + (d.actualHours - d.estimateHours), 0)
  const bias = Math.round(totalBias / n * 10) / 10

  // Calculate R² (coefficient of determination)
  const meanActual = data.reduce((acc, d) => acc + d.actualHours, 0) / n
  const ssRes = data.reduce((acc, d) => acc + Math.pow(d.actualHours - d.estimateHours, 2), 0)
  const ssTot = data.reduce((acc, d) => acc + Math.pow(d.actualHours - meanActual, 2), 0)
  const r2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 100) / 100 : 0

  return { bias, r2: Math.max(0, r2).toFixed(2) }
}
