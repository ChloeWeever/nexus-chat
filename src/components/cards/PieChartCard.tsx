import { DonutChart, PieChart } from '@ui5/webcomponents-react-charts'
import { Card, CardHeader } from '@ui5/webcomponents-react'
import type { PieChartData } from '@/types'

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

interface PieChartCardProps {
  title?: string
  data: PieChartData
  className?: string
}

export default function PieChartCard({ title, data, className }: PieChartCardProps): JSX.Element {
  const dataset = data.data.map((item) => ({ name: item.name, value: item.value }))
  const colors = data.data.map((item, i) => item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length])

  const dimension = { accessor: 'name' }
  const measure = { accessor: 'value', colors }

  const chart = data.donut ? (
    <DonutChart
      style={{ height: '280px' }}
      dataset={dataset}
      dimension={dimension}
      measure={measure}
    />
  ) : (
    <PieChart
      style={{ height: '280px' }}
      dataset={dataset}
      dimension={dimension}
      measure={measure}
    />
  )

  if (title) {
    return (
      <Card className={className} header={<CardHeader titleText={title} />}>
        {chart}
      </Card>
    )
  }
  return <Card className={className}>{chart}</Card>
}
