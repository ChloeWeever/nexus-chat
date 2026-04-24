import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { LineChartData } from '@/types'
import { cn } from '@/lib/utils'

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

interface LineChartCardProps {
  title?: string
  data: LineChartData
  className?: string
}

export default function LineChartCard({ title, data, className }: LineChartCardProps): JSX.Element {
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
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
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
            {data.datasets.map((ds, i) => (
              <Line
                key={ds.label}
                type="monotone"
                dataKey={ds.label}
                stroke={ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
