import { type SampleCustomer } from '@/entities/customer'
import { MoneyDisplay, NumberDisplay } from '@/features/number-motion'
import {
  useErrorMessage,
  useFormatters,
  useLocalePreferences,
  useTranslation,
} from '@/shared/lib/i18n'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { HStack, VStack } from '@/shared/ui/stack'
import { Pencil } from 'lucide-react'
import { type CustomersSearch } from '../model/search'

import { RouterTextLink } from '@/shared/ui/text-link'
import { CustomerStatusBadge } from './customer-status-badge'

const countFormat = { maximumFractionDigits: 0 }
interface CustomerDetailsSheetProps {
  open: boolean
  customer: SampleCustomer | undefined
  search: CustomersSearch
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: Event) => void
  onEdit: (record: SampleCustomer, trigger: HTMLButtonElement) => void
}
export function CustomerDetailsSheet({
  open,
  customer,
  search,
  isLoading,
  error,
  onRetry,
  onOpenChange,
  onCloseAutoFocus,
  onEdit,
}: CustomerDetailsSheetProps) {
  const { t } = useTranslation('admin')
  const { t: editorT } = useTranslation('customerEditor')
  const { formatDate } = useFormatters()
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
            {customer?.name ?? t('customers.details')}
          </SheetTitle>
          <SheetDescription>
            {customer
              ? t('customers.sampleProfile', { id: customer.id })
              : t('customers.detailsHint')}
          </SheetDescription>
        </SheetHeader>
        {!customer && (
          <VStack align="stretch" className="gap-4 px-6 pb-6">
            <p role={isLoading ? 'status' : 'alert'}>
              {isLoading
                ? t('customers.loading')
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
        {customer && (
          <VStack
            align="stretch"
            className="@container/customer-details min-w-0 gap-6 px-6 pb-6 text-sm wrap-anywhere"
          >
            <HStack wrap className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  onEdit(customer, event.currentTarget)
                }}
              >
                <Pencil aria-hidden="true" />
                {editorT('edit')}
              </Button>
              <RouterTextLink to="/customers" search={search} target="_blank">
                {t('common.openDetailLink')}
              </RouterTextLink>
            </HStack>
            <HStack className="gap-3">
              <Avatar className="size-12 shrink-0">
                <AvatarFallback className="font-medium">{customer.initials}</AvatarFallback>
              </Avatar>
              <VStack align="start" className="min-w-0 gap-1.5">
                <p className="wrap-anywhere text-muted-foreground">{customer.email}</p>
                <CustomerStatusBadge status={customer.status} />
              </VStack>
            </HStack>
            <div className="grid grid-cols-1 gap-3 @xs/customer-details:grid-cols-2">
              <Card className="min-w-0 gap-2 py-4 shadow-none">
                <CardHeader className="px-4">
                  <CardTitle className="text-xs font-normal text-muted-foreground">
                    {t('customers.lifetimeOrders')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 text-2xl font-semibold tabular-nums">
                  <NumberDisplay animate wrap value={customer.orders} format={countFormat} />
                </CardContent>
              </Card>
              <Card className="min-w-0 gap-2 py-4 shadow-none">
                <CardHeader className="px-4">
                  <CardTitle className="text-xs font-normal text-muted-foreground">
                    {t('customers.currencySpent', { currency })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 text-xl font-semibold tabular-nums">
                  <MoneyDisplay animate wrap value={customer.spent / 100} />
                </CardContent>
              </Card>
            </div>
            <VStack asChild align="stretch" className="gap-4">
              <section aria-label={t('customers.information')}>
                <h2 className="font-medium">{t('customers.information')}</h2>
                <VStack asChild align="stretch" className="gap-4">
                  <dl>
                    <VStack align="stretch" className="gap-1">
                      <dt className="text-xs text-muted-foreground">{t('customers.location')}</dt>
                      <dd>
                        {customer.city}, {customer.country}
                      </dd>
                    </VStack>
                    <VStack align="stretch" className="gap-1">
                      <dt className="text-xs text-muted-foreground">{t('customers.since')}</dt>
                      <dd>{formatDate(customer.joined, { year: 'numeric' })}</dd>
                    </VStack>
                    <VStack align="stretch" className="gap-1">
                      <dt className="text-xs text-muted-foreground">{t('customers.lastOrder')}</dt>
                      <dd>
                        {customer.lastOrder
                          ? formatDate(customer.lastOrder, { year: 'numeric' })
                          : t('customers.noOrders')}
                      </dd>
                    </VStack>
                    <VStack align="stretch" className="gap-1">
                      <dt className="text-xs text-muted-foreground">{t('customers.type')}</dt>
                      <dd>
                        {customer.orders === 0
                          ? editorT('noPurchaseHistory')
                          : customer.orders === 1
                            ? t('customers.firstTimeCustomer')
                            : t('customers.returningCustomer')}
                      </dd>
                    </VStack>
                  </dl>
                </VStack>
              </section>
            </VStack>
            <Separator />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('customers.disclaimer')}
            </p>
          </VStack>
        )}
      </SheetContent>
    </Sheet>
  )
}
