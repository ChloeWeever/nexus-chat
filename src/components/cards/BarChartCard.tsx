import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { BarChartData } from '@/types'
import { cn } from '@/lib/utils'

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

interface BarChartCardProps {
  title?: string
  data: BarChartData
  className?: string
}

export default function BarChartCard({ title, data, className }: BarChartCardProps): JSX.Element {
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
          <BarChart
            data={chartData}
            layout={data.horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 4, right: 16, left: -16, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            {data.horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={80} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
              </>
            )}
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
              <Bar
                key={ds.label}
                dataKey={ds.label}
                fill={ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
