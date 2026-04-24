import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MetricData } from '@/types'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  data: MetricData
  className?: string
}

export default function MetricCard({ data, className }: MetricCardProps): JSX.Element {
  return (
    <div className={cn('bg-card p-4', className)}>
      <div
        className={cn(
          'grid gap-3',
          data.metrics.length === 1 && 'grid-cols-1',
          data.metrics.length === 2 && 'grid-cols-2',
          data.metrics.length === 3 && 'grid-cols-3',
          data.metrics.length >= 4 && 'grid-cols-2 sm:grid-cols-4'
        )}
      >
        {data.metrics.map((metric, i) => (
          <div
            key={i}
            className="rounded-lg bg-muted/30 border border-border/40 px-4 py-3 flex flex-col gap-1"
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {metric.label}
            </span>
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {metric.value}
            </span>
            {metric.change && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  metric.trend === 'up' && 'text-emerald-500',
                  metric.trend === 'down' && 'text-red-500',
                  metric.trend === 'neutral' && 'text-muted-foreground',
                  !metric.trend && 'text-muted-foreground'
                )}
              >
                {metric.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {metric.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {metric.trend === 'neutral' && <Minus className="h-3 w-3" />}
                {metric.change}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
