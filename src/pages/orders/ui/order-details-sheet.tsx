import { type SampleOrder } from '@/entities/order'
import {
  useErrorMessage,
  useFormatters,
  useLocalePreferences,
  useTranslation,
} from '@/shared/lib/i18n'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { HStack, VStack } from '@/shared/ui/stack'
import { Pencil } from 'lucide-react'
import { orderSubtotal, orderTotal } from '../model/sample-orders'
import { type OrdersSearch } from '../model/search'

import { RouterTextLink } from '@/shared/ui/text-link'
import { OrderHistory } from './order-history'
import { OrderStatusBadge } from './order-status-badge'

interface OrderDetailsSheetProps {
  open: boolean
  order: SampleOrder | undefined
  search: OrdersSearch
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: Event) => void
  onEdit: (record: SampleOrder, trigger: HTMLButtonElement) => void
}
export function OrderDetailsSheet({
  open,
  order,
  search,
  isLoading,
  error,
  onRetry,
  onOpenChange,
  onCloseAutoFocus,
  onEdit,
}: OrderDetailsSheetProps) {
  const { t } = useTranslation('admin')
  const { t: editorT } = useTranslation('orderEditor')
  const { formatNumber, formatMoney, formatDate } = useFormatters()
  const currency = useLocalePreferences((state) => state.currency)
  const errorMessage = useErrorMessage()
  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open)
      }}
    >
      <SheetContent
        className="w-full overflow-y-auto md:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader className="border-b p-6 pr-12">
          <SheetTitle className="wrap-anywhere">
            {order ? t('orders.orderId', { id: order.id }) : t('orders.details')}
          </SheetTitle>
          <SheetDescription>
            {order
              ? t('orders.placed', { date: formatDate(order.date, { year: 'numeric' }) })
              : t('orders.detailsHint')}
          </SheetDescription>
        </SheetHeader>
        {!order && (
          <VStack align="stretch" className="gap-4 px-6 pb-6">
            <p role={isLoading ? 'status' : 'alert'}>
              {isLoading
                ? t('orders.loading')
                : error
                  ? errorMessage(error)
                  : t('common.detailUnavailable')}
            </p>
            {error && (
              <Button variant="outline" onClick={onRetry}>
                {t('common.tryAgain')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t('common.backToList')}
            </Button>
          </VStack>
        )}
        {order && (
          <VStack align="stretch" className="min-w-0 gap-6 px-6 pb-6 text-sm wrap-anywhere">
            <HStack wrap className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  onEdit(order, event.currentTarget)
                }}
              >
                <Pencil aria-hidden="true" />
                {editorT('edit')}
              </Button>
              <RouterTextLink to="/orders" search={search} target="_blank">
                {t('common.openDetailLink')}
              </RouterTextLink>
            </HStack>
            <HStack justify="between" wrap className="gap-3">
              <OrderStatusBadge status={order.status} />
              <span className="text-muted-foreground">
                {t('orders.paymentValue', {
                  status: t(`orders.paymentStatus.${order.payment}`),
                })}
              </span>
            </HStack>
            <VStack asChild align="stretch" className="gap-3">
              <section aria-label={t('orders.orderItems')}>
                <h2 className="font-medium">{t('orders.items')}</h2>
                <ul className="divide-y rounded-lg border px-4">
                  {order.items.map((item, index) => (
                    <HStack asChild key={index} justify="between" wrap className="gap-3 py-4">
                      <li>
                        <VStack align="stretch" className="min-w-0 flex-1 gap-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(item.quantity)} × {formatMoney(item.unitPrice / 100)}
                          </p>
                        </VStack>
                        <span className="max-w-full tabular-nums">
                          {formatMoney((item.quantity * item.unitPrice) / 100)}
                        </span>
                      </li>
                    </HStack>
                  ))}
                </ul>
                <VStack asChild align="stretch" className="gap-2">
                  <dl>
                    <HStack justify="between" className="gap-3 text-muted-foreground">
                      <dt>{t('orders.subtotal')}</dt>
                      <dd className="min-w-0 text-right tabular-nums">
                        {formatMoney(orderSubtotal(order) / 100)}
                      </dd>
                    </HStack>
                    <HStack justify="between" className="gap-3 text-muted-foreground">
                      <dt>{t('orders.shipping')}</dt>
                      <dd className="min-w-0 text-right tabular-nums">
                        {formatMoney(order.shipping / 100)}
                      </dd>
                    </HStack>
                    <HStack justify="between" className="gap-3 pt-2 font-semibold">
                      <dt>{t('orders.currencyTotal', { currency })}</dt>
                      <dd className="min-w-0 text-right tabular-nums">
                        {formatMoney(orderTotal(order) / 100)}
                      </dd>
                    </HStack>
                  </dl>
                </VStack>
              </section>
            </VStack>
            <Separator />
            <VStack asChild align="stretch" className="gap-3">
              <section aria-label={t('orders.orderCustomer')}>
                <h2 className="font-medium">{t('common.customer')}</h2>
                <HStack className="gap-3">
                  <Avatar className="shrink-0">
                    <AvatarFallback>{order.customer.initials}</AvatarFallback>
                  </Avatar>
                  <VStack align="stretch" className="min-w-0">
                    <p className="font-medium wrap-anywhere">{order.customer.name}</p>
                    <p className="wrap-anywhere text-muted-foreground">{order.customer.email}</p>
                  </VStack>
                </HStack>
                <p className="text-muted-foreground">
                  {t('orders.destination', {
                    city: order.city,
                    country: order.country,
                  })}
                </p>
              </section>
            </VStack>
            <Separator />
            <OrderHistory entries={order.history} />
            <Separator />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('orders.disclaimer')}
            </p>
          </VStack>
        )}
      </SheetContent>
    </Sheet>
  )
}
