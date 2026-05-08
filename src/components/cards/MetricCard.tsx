import { Card, FlexBox, FlexBoxDirection, FlexBoxWrap, Text, ObjectStatus } from '@ui5/webcomponents-react'
import type { MetricData } from '@/types'

interface MetricCardProps {
  data: MetricData
  className?: string
}

function trendToState(trend?: string): 'Positive' | 'Negative' | 'None' {
  if (trend === 'up') return 'Positive'
  if (trend === 'down') return 'Negative'
  return 'None'
}

export default function MetricCard({ data, className }: MetricCardProps): JSX.Element {
  return (
    <Card className={className}>
      <FlexBox wrap={FlexBoxWrap.Wrap} style={{ padding: '1rem', gap: '0.75rem' }}>
        {data.metrics.map((metric, i) => (
          <Card
            key={i}
            style={{ flex: '1 1 160px', minWidth: '140px' }}
          >
            <FlexBox direction={FlexBoxDirection.Column} style={{ padding: '0.75rem 1rem', gap: '0.25rem' }}>
              <Text style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {metric.label}
              </Text>
              <Text style={{ fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {metric.value}
              </Text>
              {metric.change && (
                <ObjectStatus state={trendToState(metric.trend)} showDefaultIcon>
                  {metric.change}
                </ObjectStatus>
              )}
            </FlexBox>
          </Card>
        ))}
      </FlexBox>
    </Card>
  )
}
