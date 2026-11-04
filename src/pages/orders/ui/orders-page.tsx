import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { ordersQueryOptions, orderStatuses, type OrderStatus } from '@/entities/order'
import { NumberDisplay } from '@/features/number-motion'
import {
  useErrorMessage,
  useFormatters,
  useLocalePreferences,
  useTranslation,
} from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { compareOrders, orderSortOptions, orderSubtotal, orderTotal } from '../model/sample-orders'
import { ordersSearchDefaults, type OrdersSearch } from '../model/search'

const pageSize = 6
const orderTableColumnCount = 12
const countFormat = { maximumFractionDigits: 0 }

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation('admin')
  return (
    <Badge
      variant={
        status === 'Delivered' ? 'default' : status === 'Cancelled' ? 'outline' : 'secondary'
      }
      className="font-normal"
    >
      {t(`orders.status.${status}`)}
    </Badge>
  )
}

interface OrdersPageProps {
  search: OrdersSearch
  onSearchChange: SearchChange<OrdersSearch>
}

export function OrdersPage({ search, onSearchChange }: OrdersPageProps) {
  const { t } = useTranslation('admin')
  const errorMessage = useErrorMessage()
  const { formatNumber, formatMoney, formatDate } = useFormatters()
  const currency = useLocalePreferences((state) => state.currency)
  const ordersQuery = useQuery(ordersQueryOptions())
  const orders = ordersQuery.data ?? []
  const isLoading = ordersQuery.isPending && !ordersQuery.data
  const hasLoadError = ordersQuery.isError && !ordersQuery.data
  const { q, status, sort, page } = search
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const selectedOrder = orders.find((item) => item.id === selectedOrderId)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const scrollHintId = useId()
  const query = q.trim().toLowerCase()
  const filteredOrders = orders
    .filter(
      (order) =>
        (status === 'all' || order.status === status) &&
        `${order.id} ${order.customer.name} ${order.customer.email}`.toLowerCase().includes(query),
    )
    .sort((left, right) => compareOrders(left, right, sort))
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const currentPage = Math.min(page, pageCount) - 1
  const visibleOrders = filteredOrders.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const hasFilters = q !== '' || status !== 'all' || sort !== 'newest'

  useEffect(() => {
    if (ordersQuery.isSuccess && !ordersQuery.isFetching && page > pageCount) {
      onSearchChange({ page: pageCount }, { replace: true })
    }
  }, [ordersQuery.isSuccess, ordersQuery.isFetching, page, pageCount, onSearchChange])

  // A refreshed response may remove the selected record; keep only valid UI selection.
  if (selectedOrderId !== null && ordersQuery.data && !selectedOrder) {
    setSelectedOrderId(null)
  }

  function resetFilters() {
    onSearchChange(ordersSearchDefaults)
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  const summaries = [
    {
      title: t('orders.summary.total'),
      value: orders.length,
      description: t('orders.summary.range'),
      Icon: Package,
    },
    {
      title: t('orders.status.Processing'),
      value: orders.filter((order) => order.status === 'Processing').length,
      description: t('orders.summary.processing'),
      Icon: Clock3,
    },
    {
      title: t('orders.status.Shipped'),
      value: orders.filter((order) => order.status === 'Shipped').length,
      description: t('orders.summary.shipped'),
      Icon: Truck,
    },
    {
      title: t('orders.status.Delivered'),
      value: orders.filter((order) => order.status === 'Delivered').length,
      description: t('orders.summary.delivered'),
      Icon: CheckCheck,
    },
  ]

  return (
    <VStack align="stretch" className="min-w-0 gap-6">
      <PageHeader
        title={t('orders.title')}
        description={t('orders.intro')}
        badgeLabel={t('common.sample')}
      />

      {ordersQuery.isError && ordersQuery.data && (
        <Alert variant="destructive">
          <AlertTitle>{t('orders.refreshError')}</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(ordersQuery.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void ordersQuery.refetch()}>
              {t('common.tryAgain')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaries.map(({ title, value, description, Icon }) => (
          <Card
            key={title}
            className="gap-3 py-5 shadow-none"
            aria-label={title}
            aria-busy={isLoading}
          >
            <HStack asChild justify="between" className="px-5">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
            </HStack>
            <VStack asChild align="stretch" className="gap-1 px-5">
              <CardContent>
                <HStack className="h-9 text-3xl font-semibold tracking-tight tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : ordersQuery.data ? (
                    <NumberDisplay animate value={value} format={countFormat} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </HStack>
                <p className="text-xs text-muted-foreground">{description}</p>
              </CardContent>
            </VStack>
          </Card>
        ))}
      </div>

      <Card className="min-w-0 gap-5 overflow-hidden shadow-none" aria-busy={isLoading}>
        <CardHeader className="px-5">
          <CardTitle className="text-base">{t('orders.all')}</CardTitle>
          <CardDescription>{t('orders.browse', { currency })}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="min-w-0 gap-4 px-0">
          <CardContent>
            <Tabs
              value={status}
              onValueChange={(value) => {
                onSearchChange({
                  status: orderStatuses.find((item) => item === value) ?? 'all',
                  page: 1,
                })
              }}
              className="min-w-0 gap-4"
            >
              <div className="px-5">
                <HStack
                  asChild
                  wrap
                  className="max-w-full group-data-[orientation=horizontal]/tabs:h-auto"
                >
                  <TabsList aria-label={t('orders.filterStatus')}>
                    <TabsTrigger value="all" className="h-8 flex-none px-3">
                      {t('orders.all')}
                    </TabsTrigger>
                    {orderStatuses.map((item) => (
                      <TabsTrigger key={item} value={item} className="h-8 flex-none px-3">
                        {t(`orders.status.${item}`)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </HStack>
              </div>
              <VStack asChild align="stretch" className="min-w-0 gap-4">
                <TabsContent value={status}>
                  <HStack wrap className="gap-2 px-5">
                    <div className="relative w-full md:max-w-xs">
                      <Search
                        className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Label htmlFor="orders-search" className="sr-only">
                        {t('orders.search')}
                      </Label>
                      <Input
                        id="orders-search"
                        ref={searchRef}
                        placeholder={t('orders.searchPlaceholder')}
                        value={q}
                        maxLength={200}
                        className="pl-9"
                        onChange={(event) => {
                          onSearchChange({ q: event.target.value, page: 1 }, { replace: true })
                        }}
                      />
                    </div>
                    <Select
                      value={sort}
                      onValueChange={(value) => {
                        onSearchChange({
                          sort:
                            orderSortOptions.find((item) => item.value === value)?.value ??
                            'newest',
                          page: 1,
                        })
                      }}
                    >
                      <SelectTrigger aria-label={t('orders.sortLabel')} className="w-full md:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {orderSortOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {t(`orders.sort.${item.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasFilters && (
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        <X aria-hidden="true" />
                        {t('common.reset')}
                      </Button>
                    )}
                  </HStack>
                  <HStack
                    aria-hidden={!isLoading && visibleOrders.length === 0}
                    className={`gap-2 px-5 text-xs text-muted-foreground ${!isLoading && visibleOrders.length === 0 ? 'invisible' : ''}`}
                  >
                    <ArrowLeftRight className="size-4 shrink-0" aria-hidden="true" />
                    <p id={scrollHintId}>{t('orders.scrollHint')}</p>
                  </HStack>
                  {isLoading || visibleOrders.length ? (
                    <div className="h-124 min-w-0 border-y">
                      <Table
                        className="min-w-[1840px] table-fixed"
                        containerProps={{
                          tabIndex: 0,
                          role: 'region',
                          'aria-label': t('orders.table'),
                          'aria-busy': isLoading,
                          'aria-describedby': scrollHintId,
                          className:
                            'h-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        }}
                      >
                        <colgroup>
                          <col className="w-[128px]" />
                          <col className="w-[240px]" />
                          <col className="w-[136px]" />
                          <col className="w-[120px]" />
                          <col className="w-[152px]" />
                          <col className="w-[256px]" />
                          <col className="w-[96px]" />
                          <col className="w-[144px]" />
                          <col className="w-[160px]" />
                          <col className="w-[136px]" />
                          <col className="w-[128px]" />
                          <col className="w-[144px]" />
                        </colgroup>
                        <TableHeader>
                          <TableRow className="bg-muted hover:bg-muted">
                            <TableHead className="sticky left-0 z-10 border-r bg-muted pl-5">
                              {t('orders.order')}
                            </TableHead>
                            <TableHead>{t('common.customer')}</TableHead>
                            <TableHead>{t('common.status')}</TableHead>
                            <TableHead>{t('orders.payment')}</TableHead>
                            <TableHead>{t('orders.date')}</TableHead>
                            <TableHead>{t('orders.products')}</TableHead>
                            <TableHead className="text-right">{t('orders.quantity')}</TableHead>
                            <TableHead>{t('orders.city')}</TableHead>
                            <TableHead>{t('orders.country')}</TableHead>
                            <TableHead className="text-right">{t('orders.subtotal')}</TableHead>
                            <TableHead className="text-right">{t('orders.shipping')}</TableHead>
                            <TableHead className="pr-5 text-right">{t('orders.total')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading
                            ? Array.from({ length: pageSize }, (_, index) => (
                                <TableRow key={index} className="h-18" aria-hidden="true">
                                  {Array.from({ length: orderTableColumnCount }, (_, cell) => (
                                    <TableCell
                                      key={cell}
                                      className={
                                        cell === 0
                                          ? 'sticky left-0 z-10 border-r bg-card px-5'
                                          : 'px-5'
                                      }
                                    >
                                      <Skeleton className="h-4 w-full max-w-28" />
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            : visibleOrders.map((order) => (
                                <TableRow
                                  key={order.id}
                                  className="group/order-row h-18 hover:bg-muted"
                                >
                                  <TableCell className="sticky left-0 z-10 border-r bg-card py-2 pl-5 group-hover/order-row:bg-muted">
                                    <Button
                                      variant="link"
                                      className="h-auto p-0 font-medium text-foreground"
                                      aria-label={t('orders.viewOrder', { id: order.id })}
                                      onClick={(event) => {
                                        detailTrigger.current = event.currentTarget
                                        setSelectedOrderId(order.id)
                                      }}
                                    >
                                      {order.id}
                                    </Button>
                                  </TableCell>
                                  <TableCell>
                                    <HStack className="min-w-0 gap-3">
                                      <Avatar className="size-8 shrink-0">
                                        <AvatarFallback className="text-xs font-medium">
                                          {order.customer.initials}
                                        </AvatarFallback>
                                      </Avatar>
                                      <VStack align="stretch" className="min-w-0 flex-1">
                                        <p
                                          className="truncate font-medium"
                                          title={order.customer.name}
                                        >
                                          {order.customer.name}
                                        </p>
                                        <p
                                          className="truncate text-xs text-muted-foreground"
                                          title={order.customer.email}
                                        >
                                          {order.customer.email}
                                        </p>
                                      </VStack>
                                    </HStack>
                                  </TableCell>
                                  <TableCell>
                                    <OrderStatusBadge status={order.status} />
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {t(`orders.paymentStatus.${order.payment}`)}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {formatDate(order.date, { year: 'numeric' })}
                                  </TableCell>
                                  <TableCell>
                                    <p
                                      className="truncate"
                                      title={order.items.map((item) => item.name).join(', ')}
                                    >
                                      {order.items.map((item) => item.name).join(', ')}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatNumber(
                                      order.items.reduce((sum, item) => sum + item.quantity, 0),
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    <p className="truncate" title={order.city}>
                                      {order.city}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    <p className="truncate" title={order.country}>
                                      {order.country}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatMoney(orderSubtotal(order) / 100)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatMoney(order.shipping / 100)}
                                  </TableCell>
                                  <TableCell className="pr-5 text-right font-medium tabular-nums">
                                    {formatMoney(orderTotal(order) / 100)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          {!isLoading &&
                            Array.from(
                              { length: Math.max(0, pageSize - visibleOrders.length) },
                              (_, index) => (
                                <TableRow
                                  key={`empty-${String(index)}`}
                                  className="h-18 hover:bg-transparent"
                                  aria-hidden="true"
                                >
                                  <TableCell colSpan={orderTableColumnCount} />
                                </TableRow>
                              ),
                            )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Empty
                      className="h-124 rounded-none border-y py-12"
                      role={hasLoadError ? 'alert' : undefined}
                    >
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Search aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>
                          {hasLoadError
                            ? t('orders.loadError')
                            : orders.length
                              ? t('orders.noMatch')
                              : t('orders.empty')}
                        </EmptyTitle>
                        <EmptyDescription>
                          {hasLoadError
                            ? errorMessage(ordersQuery.error)
                            : orders.length
                              ? t('common.searchHint')
                              : t('orders.emptyHint')}
                        </EmptyDescription>
                      </EmptyHeader>
                      {hasLoadError ? (
                        <Button variant="outline" onClick={() => void ordersQuery.refetch()}>
                          {t('common.tryAgain')}
                        </Button>
                      ) : (
                        orders.length > 0 && (
                          <Button variant="outline" onClick={resetFilters}>
                            {t('common.clearFilters')}
                          </Button>
                        )
                      )}
                    </Empty>
                  )}
                  <div className="grid gap-3 px-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <p
                      className="text-xs text-muted-foreground"
                      aria-live={hasLoadError ? 'off' : 'polite'}
                    >
                      {isLoading
                        ? t('orders.loading')
                        : hasLoadError
                          ? t('orders.loadError')
                          : filteredOrders.length
                            ? t('orders.showing', {
                                start: formatNumber(currentPage * pageSize + 1),
                                end: formatNumber(
                                  Math.min((currentPage + 1) * pageSize, filteredOrders.length),
                                ),
                                total: formatNumber(filteredOrders.length),
                              })
                            : t('orders.count', { total: formatNumber(0) })}
                    </p>
                    <HStack className="gap-3">
                      <p className="text-xs font-medium tabular-nums">
                        {t('common.pageCount', {
                          current: formatNumber(currentPage + 1),
                          total: formatNumber(pageCount),
                        })}
                      </p>
                      <HStack className="gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          aria-label={t('orders.previousPage')}
                          disabled={isLoading || currentPage === 0}
                          onClick={() => {
                            onSearchChange({ page: currentPage })
                          }}
                        >
                          <ChevronLeft aria-hidden="true" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          aria-label={t('orders.nextPage')}
                          disabled={isLoading || currentPage + 1 >= pageCount}
                          onClick={() => {
                            onSearchChange({ page: currentPage + 2 })
                          }}
                        >
                          <ChevronRight aria-hidden="true" />
                        </Button>
                      </HStack>
                    </HStack>
                  </div>
                </TabsContent>
              </VStack>
            </Tabs>
          </CardContent>
        </VStack>
      </Card>

      <Sheet
        open={selectedOrder !== undefined}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null)
        }}
      >
        <SheetContent
          className="w-full overflow-y-auto md:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            const target = detailTrigger.current?.isConnected
              ? detailTrigger.current
              : searchRef.current
            target?.focus()
          }}
        >
          <SheetHeader className="border-b p-6 pr-12">
            <SheetTitle>
              {selectedOrder ? t('orders.orderId', { id: selectedOrder.id }) : t('orders.details')}
            </SheetTitle>
            <SheetDescription>
              {selectedOrder
                ? t('orders.placed', { date: formatDate(selectedOrder.date, { year: 'numeric' }) })
                : t('orders.detailsHint')}
            </SheetDescription>
          </SheetHeader>
          {selectedOrder && (
            <VStack align="stretch" className="gap-6 px-6 pb-6 text-sm">
              <HStack justify="between" wrap className="gap-3">
                <OrderStatusBadge status={selectedOrder.status} />
                <span className="text-muted-foreground">
                  {t('orders.paymentValue', {
                    status: t(`orders.paymentStatus.${selectedOrder.payment}`),
                  })}
                </span>
              </HStack>
              <VStack asChild align="stretch" className="gap-3">
                <section aria-label={t('orders.orderItems')}>
                  <h2 className="font-medium">{t('orders.items')}</h2>
                  <ul className="divide-y rounded-lg border px-4">
                    {selectedOrder.items.map((item) => (
                      <HStack asChild key={item.name} justify="between" className="gap-3 py-4">
                        <li>
                          <VStack align="stretch" className="min-w-0 gap-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(item.quantity)} × {formatMoney(item.unitPrice / 100)}
                            </p>
                          </VStack>
                          <span className="shrink-0 tabular-nums">
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
                        <dd className="tabular-nums">
                          {formatMoney(orderSubtotal(selectedOrder) / 100)}
                        </dd>
                      </HStack>
                      <HStack justify="between" className="gap-3 text-muted-foreground">
                        <dt>{t('orders.shipping')}</dt>
                        <dd className="tabular-nums">
                          {formatMoney(selectedOrder.shipping / 100)}
                        </dd>
                      </HStack>
                      <HStack justify="between" className="gap-3 pt-2 font-semibold">
                        <dt>{t('orders.currencyTotal', { currency })}</dt>
                        <dd className="tabular-nums">
                          {formatMoney(orderTotal(selectedOrder) / 100)}
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
                    <Avatar>
                      <AvatarFallback>{selectedOrder.customer.initials}</AvatarFallback>
                    </Avatar>
                    <VStack align="stretch" className="min-w-0">
                      <p className="font-medium break-words">{selectedOrder.customer.name}</p>
                      <p className="break-all text-muted-foreground">
                        {selectedOrder.customer.email}
                      </p>
                    </VStack>
                  </HStack>
                  <p className="text-muted-foreground">
                    {t('orders.destination', {
                      city: selectedOrder.city,
                      country: selectedOrder.country,
                    })}
                  </p>
                </section>
              </VStack>
              <Separator />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('orders.disclaimer')}
              </p>
            </VStack>
          )}
        </SheetContent>
      </Sheet>
    </VStack>
  )
}
