import type { OrderHistoryEntry } from '@/entities/order'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { HStack, VStack } from '@/shared/ui/stack'

export function OrderHistory({ entries }: { entries: OrderHistoryEntry[] }) {
  const { t } = useTranslation('admin')
  const { formatDate } = useFormatters()
  return (
    <VStack asChild align="stretch" className="gap-3">
      <section aria-label={t('orders.history.title')}>
        <h2 className="font-medium">{t('orders.history.title')}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('orders.history.description')}
        </p>
        {entries.length ? (
          <ol className="divide-y rounded-lg border px-4">
            {entries.toReversed().map((entry, index) => {
              const from =
                entry.from === null
                  ? null
                  : entry.field === 'status'
                    ? t(`orders.status.${entry.from}`)
                    : t(`orders.paymentStatus.${entry.from}`)
              const to =
                entry.field === 'status'
                  ? t(`orders.status.${entry.to}`)
                  : t(`orders.paymentStatus.${entry.to}`)
              return (
                <VStack
                  asChild
                  align="stretch"
                  className="gap-1 py-3"
                  key={`${entry.field}-${entry.occurredAt}-${String(index)}`}
                >
                  <li>
                    <HStack wrap justify="between" className="gap-2">
                      <span className="font-medium">
                        {t(
                          entry.field === 'status'
                            ? 'orders.history.status'
                            : 'orders.history.payment',
                        )}
                      </span>
                      <time dateTime={entry.occurredAt} className="text-xs text-muted-foreground">
                        {formatDate(entry.occurredAt, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'UTC',
                        })}{' '}
                        UTC
                      </time>
                    </HStack>
                    <p>
                      {from === null
                        ? t('orders.history.initial', { value: to })
                        : t('orders.history.changed', { from, to })}
                    </p>
                  </li>
                </VStack>
              )
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{t('orders.history.empty')}</p>
        )}
      </section>
    </VStack>
  )
}
