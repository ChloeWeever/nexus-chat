import { AnalyticalTable } from '@ui5/webcomponents-react'
import { Card, CardHeader } from '@ui5/webcomponents-react'
import type { TableData } from '@/types'

interface TableCardProps {
  title?: string
  data: TableData
  className?: string
}

export default function TableCard({ title, data, className }: TableCardProps): JSX.Element {
  const columns = data.columns.map((col) => ({
    Header: col.label,
    accessor: col.key,
    hAlign: col.align === 'right' ? 'End' : col.align === 'center' ? 'Center' : 'Begin'
  }))

  const table = (
    <AnalyticalTable
      data={data.rows}
      columns={columns}
      minRows={1}
      visibleRows={Math.max(3, Math.min(10, data.rows.length))}
      scaleWidthMode="Smart"
    />
  )

  if (title) {
    return (
      <Card className={className} header={<CardHeader titleText={title} />}>
        {table}
      </Card>
    )
  }
  return <Card className={className}>{table}</Card>
}
