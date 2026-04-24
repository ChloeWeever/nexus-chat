import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { TableData } from '@/types'
import { cn } from '@/lib/utils'

interface TableCardProps {
  title?: string
  data: TableData
  className?: string
}

export default function TableCard({ title, data, className }: TableCardProps): JSX.Element {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortKey
    ? [...data.rows].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        const aStr = String(av ?? '')
        const bStr = String(bv ?? '')
        const cmp = isNaN(Number(av)) || isNaN(Number(bv))
          ? aStr.localeCompare(bStr)
          : Number(av) - Number(bv)
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data.rows

  return (
    <div className={cn('bg-card', className)}>
      {title && (
        <div className="px-5 py-3 border-b border-border/60">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap',
                    'hover:text-foreground transition-colors',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-border/30 transition-colors',
                  'hover:bg-muted/20',
                  i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                )}
              >
                {data.columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-2.5 text-foreground',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                  >
                    {String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">No data</p>
        )}
      </div>
    </div>
  )
}
