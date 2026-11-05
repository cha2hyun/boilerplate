import { type SampleCustomer } from '@/entities/customer'
import { NumberDisplay } from '@/features/number-motion'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { MetricCard } from '@/shared/ui/metric-card'
import { HStack, VStack } from '@/shared/ui/stack'
import { Repeat2, UserCheck, UserRoundPlus, Users } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { cn } from '@/shared/lib/utils'

import { summarizeCustomers } from '../model/selectors'

const countFormat = { maximumFractionDigits: 0 }
export function CustomersSummary({
  customers,
  isLoading,
  hasData,
}: {
  customers: SampleCustomer[]
  isLoading: boolean
  hasData: boolean
}) {
  const { t } = useTranslation('admin')
  const { formatNumber } = useFormatters()
  const [expanded, setExpanded] = useState(false)
  const summaryId = useId()
  const counts = useMemo(() => summarizeCustomers(customers), [customers])
  const summaries = [
    {
      title: t('customers.summary.total'),
      value: customers.length,
      description: t('customers.summary.totalHint'),
      Icon: Users,
    },
    {
      title: t('customers.summary.active'),
      value: counts.active,
      description: t('customers.summary.activeHint'),
      Icon: UserCheck,
    },
    {
      title: t('customers.summary.returning'),
      value: counts.returning,
      description: t('customers.summary.returningHint'),
      Icon: Repeat2,
    },
    {
      title: t('customers.summary.firstTime'),
      value: counts.firstTime,
      description: t('customers.summary.firstTimeHint'),
      Icon: UserRoundPlus,
    },
  ]

  return (
    <VStack align="stretch" className="min-w-0 gap-3">
      <HStack justify="between" wrap className="gap-2 md:hidden">
        <p className="text-sm text-muted-foreground">
          {hasData
            ? t('customers.count', { total: formatNumber(customers.length) })
            : t(isLoading ? 'customers.loading' : 'customers.loadError')}
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
