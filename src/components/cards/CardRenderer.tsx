import type { CardBlock } from '@/types'
import { cn } from '@/lib/utils'
import BarChartCard from './BarChartCard'
import LineChartCard from './LineChartCard'
import PieChartCard from './PieChartCard'
import AreaChartCard from './AreaChartCard'
import TableCard from './TableCard'
import MetricCard from './MetricCard'
import ProgressCard from './ProgressCard'

interface CardRendererProps {
  block: CardBlock
  className?: string
}

export default function CardRenderer({ block, className }: CardRendererProps): JSX.Element {
  const wrapperClass = cn('my-3 rounded-xl overflow-hidden border border-border/60', className)

  switch (block.cardType) {
    case 'bar_chart':
      return <BarChartCard className={wrapperClass} title={block.title} data={block.data as never} />
    case 'line_chart':
      return <LineChartCard className={wrapperClass} title={block.title} data={block.data as never} />
    case 'area_chart':
      return <AreaChartCard className={wrapperClass} title={block.title} data={block.data as never} />
    case 'pie_chart':
      return <PieChartCard className={wrapperClass} title={block.title} data={block.data as never} />
    case 'table':
      return <TableCard className={wrapperClass} title={block.title} data={block.data as never} />
    case 'metric':
      return <MetricCard className={wrapperClass} data={block.data as never} />
    case 'progress':
      return <ProgressCard className={wrapperClass} title={block.title} data={block.data as never} />
    default:
      return (
        <div className={cn(wrapperClass, 'bg-muted/30 p-4')}>
          <p className="text-muted-foreground text-sm">Unknown card type: {block.cardType}</p>
        </div>
      )
  }
}
