import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { AreaChartData } from '@/types'
import { cn } from '@/lib/utils'

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

interface AreaChartCardProps {
  title?: string
  data: AreaChartData
  className?: string
}

export default function AreaChartCard({ title, data, className }: AreaChartCardProps): JSX.Element {
  const chartData = data.labels.map((label, i) => {
    const entry: Record<string, unknown> = { label }
    data.datasets.forEach((ds) => {
      entry[ds.label] = ds.data[i]
    })
    return entry
  })

  return (
    <div className={cn('bg-card', className)}>
      {title && (
        <div className="px-5 py-3 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      )}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
            <defs>
              {data.datasets.map((ds, i) => {
                const color = ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
                return (
                  <linearGradient key={ds.label} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: 12
              }}
            />
            {data.datasets.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {data.datasets.map((ds, i) => {
              const color = ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
              return (
                <Area
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${i})`}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
