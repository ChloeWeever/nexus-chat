import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PieChartData } from '@/types'
import { cn } from '@/lib/utils'

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

interface PieChartCardProps {
  title?: string
  data: PieChartData
  className?: string
}

interface LabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}

const RADIAN = Math.PI / 180
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function PieChartCard({ title, data, className }: PieChartCardProps): JSX.Element {
  const innerRadius = data.donut ? 60 : 0

  return (
    <div className={cn('bg-card', className)}>
      {title && (
        <div className="px-5 py-3 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      )}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data.data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={entry.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: 12
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
