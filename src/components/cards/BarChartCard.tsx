import { BarChart, ColumnChart } from '@ui5/webcomponents-react-charts'
import { Card, CardHeader } from '@ui5/webcomponents-react'
import type { BarChartData } from '@/types'

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

interface BarChartCardProps {
  title?: string
  data: BarChartData
  className?: string
}

export default function BarChartCard({ title, data, className }: BarChartCardProps): JSX.Element {
  const dataset = data.labels.map((label, i) => {
    const entry: Record<string, unknown> = { label }
    data.datasets.forEach((ds) => { entry[ds.label] = ds.data[i] })
    return entry
  })

  const dimensions = [{ accessor: 'label' }]
  const measures = data.datasets.map((ds, i) => ({
    accessor: ds.label,
    label: ds.label,
    color: ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
  }))

  const chart = data.horizontal ? (
    <BarChart
      style={{ height: '280px' }}
      dataset={dataset}
      dimensions={dimensions}
      measures={measures}
    />
  ) : (
    <ColumnChart
      style={{ height: '280px' }}
      dataset={dataset}
      dimensions={dimensions}
      measures={measures}
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
