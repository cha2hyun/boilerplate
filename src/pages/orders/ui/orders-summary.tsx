import { type SampleOrder } from '@/entities/order'
import { NumberDisplay } from '@/features/number-motion'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { MetricCard } from '@/shared/ui/metric-card'
import { HStack, VStack } from '@/shared/ui/stack'
import { CheckCheck, Clock3, Package, Truck } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { cn } from '@/shared/lib/utils'

import { summarizeOrders } from '../model/selectors'

const countFormat = { maximumFractionDigits: 0 }
export function OrdersSummary({
  orders,
  isLoading,
  hasData,
}: {
  orders: SampleOrder[]
  isLoading: boolean
  hasData: boolean
}) {
  const { t } = useTranslation('admin')
  const { formatNumber } = useFormatters()
  const [expanded, setExpanded] = useState(false)
  const summaryId = useId()
  const counts = useMemo(() => summarizeOrders(orders), [orders])
  const summaries = [
    {
      title: t('orders.summary.total'),
      value: orders.length,
      description: t('orders.summary.range'),
      Icon: Package,
    },
    {
      title: t('orders.status.Processing'),
      value: counts.Processing,
      description: t('orders.summary.processing'),
      Icon: Clock3,
    },
    {
      title: t('orders.status.Shipped'),
      value: counts.Shipped,
      description: t('orders.summary.shipped'),
      Icon: Truck,
    },
    {
      title: t('orders.status.Delivered'),
      value: counts.Delivered,
      description: t('orders.summary.delivered'),
      Icon: CheckCheck,
    },
  ]

  return (
    <VStack align="stretch" className="min-w-0 gap-3">
      <HStack justify="between" wrap className="gap-2 md:hidden">
        <p className="text-sm text-muted-foreground">
          {hasData
            ? t('orders.count', { total: formatNumber(orders.length) })
            : t(isLoading ? 'orders.loading' : 'orders.loadError')}
        </p>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={expanded}
          aria-controls={summaryId}
          onClick={() => {
            setExpanded((value) => !value)
          }}
        >
          {t(expanded ? 'common.hideSummary' : 'common.showSummary')}
        </Button>
      </HStack>
      <div
        id={summaryId}
        className={cn('gap-4 md:grid md:grid-cols-2 xl:grid-cols-4', expanded ? 'grid' : 'hidden')}
      >
        {summaries.map(({ title, value, description, Icon }) => (
          <MetricCard
            key={title}
            label={title}
            icon={Icon}
            loading={isLoading}
            value={
              hasData ? (
                <NumberDisplay animate wrap value={value} format={countFormat} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
            footer={description}
          />
        ))}
      </div>
    </VStack>
  )
}
