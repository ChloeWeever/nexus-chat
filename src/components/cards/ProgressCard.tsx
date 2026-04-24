import type { ProgressData } from '@/types'
import { cn } from '@/lib/utils'

interface ProgressCardProps {
  title?: string
  data: ProgressData
  className?: string
}

export default function ProgressCard({ title, data, className }: ProgressCardProps): JSX.Element {
  return (
    <div className={cn('bg-card', className)}>
      {title && (
        <div className="px-5 py-3 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      )}
      <div className="px-5 py-4 flex flex-col gap-4">
        {data.items.map((item, i) => {
          const max = item.max ?? 100
          const pct = Math.min(100, Math.max(0, (item.value / max) * 100))
          const color = item.color ?? 'hsl(var(--primary))'

          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {item.max ? `${item.value}/${item.max}` : `${Math.round(pct)}%`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: color
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
