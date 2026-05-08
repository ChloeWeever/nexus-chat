import { Card, CardHeader, FlexBox, FlexBoxDirection, FlexBoxJustifyContent, ProgressIndicator, Text } from '@ui5/webcomponents-react'
import type { ProgressData } from '@/types'

interface ProgressCardProps {
  title?: string
  data: ProgressData
  className?: string
}

function pctToState(pct: number): 'Positive' | 'Information' | 'Warning' | 'Critical' {
  if (pct >= 80) return 'Positive'
  if (pct >= 50) return 'Information'
  if (pct >= 30) return 'Warning'
  return 'Critical'
}

export default function ProgressCard({ title, data, className }: ProgressCardProps): JSX.Element {
  const content = (
    <FlexBox direction={FlexBoxDirection.Column} style={{ padding: '0.75rem 1.25rem', gap: '1rem' }}>
      {data.items.map((item, i) => {
        const max = item.max ?? 100
        const pct = Math.min(100, Math.max(0, Math.round((item.value / max) * 100)))
        const label = item.max ? `${item.value}/${item.max}` : `${pct}%`

        return (
          <FlexBox key={i} direction={FlexBoxDirection.Column} style={{ gap: '0.375rem' }}>
            <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween}>
              <Text style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</Text>
              <Text style={{ fontSize: '0.875rem', color: 'var(--sapContent_LabelColor)', fontVariantNumeric: 'tabular-nums' }}>
                {label}
              </Text>
            </FlexBox>
            <ProgressIndicator
              value={pct}
              displayValue={`${pct}%`}
              valueState={pctToState(pct)}
              style={{ width: '100%' }}
            />
          </FlexBox>
        )
      })}
    </FlexBox>
  )

  if (title) {
    return (
      <Card className={className} header={<CardHeader titleText={title} />}>
        {content}
      </Card>
    )
  }
  return <Card className={className}>{content}</Card>
}
