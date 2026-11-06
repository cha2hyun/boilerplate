import { orderStatuses, type SampleOrder } from '@/entities/order'
import {
  useErrorMessage,
  useFormatters,
  useLocalePreferences,
  useTranslation,
} from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useId } from 'react'
import { orderSortOptions, orderTotal } from '../model/sample-orders'
import { ordersSearchDefaults, type OrdersSearch } from '../model/search'

import type { RefObject } from 'react'
import type { selectOrders } from '../model/selectors'
import { OrderStatusBadge } from './order-status-badge'

const orderTableColumnCount = 7
interface OrdersListProps {
  search: OrdersSearch
  onSearchChange: SearchChange<OrdersSearch>
  totalOrders: number | undefined
  selection: ReturnType<typeof selectOrders>
  isLoading: boolean
  hasLoadError: boolean
  error: Error | null
  onRetry: () => void
  searchRef: RefObject<HTMLInputElement | null>
  actionTrigger: RefObject<HTMLButtonElement | null>
  hasOpenDialog: boolean
  onView: (id: string, trigger: HTMLButtonElement | null) => void
  onEdit: (record: SampleOrder) => void
  onDelete: (record: SampleOrder) => void
}
export function OrdersList({
  search,
  onSearchChange,
  totalOrders,
  selection,
  isLoading,
  hasLoadError,
  error,
  onRetry,
  searchRef,
  actionTrigger,
  hasOpenDialog,
  onView,
  onEdit,
  onDelete,
}: OrdersListProps) {
  const { t } = useTranslation('admin')
  const { t: editor } = useTranslation('orderEditor')
  const { formatNumber, formatMoney, formatDate } = useFormatters()
  const currency = useLocalePreferences((state) => state.currency)
  const errorMessage = useErrorMessage()
  const { q, status, sort, pageSize } = search
  const { total: filteredTotal, pageCount, currentPage, visible: visibleOrders } = selection
  const scrollHintId = useId()
  const hasFilters = q !== '' || status !== 'all' || sort !== 'newest'
  const hasOrders = totalOrders === undefined ? hasFilters : totalOrders > 0
  function resetFilters() {
    onSearchChange({ ...ordersSearchDefaults, pageSize, detail: search.detail })
    requestAnimationFrame(() => searchRef.current?.focus())
  }
  return (
    <Card className="min-w-0 gap-5 overflow-hidden shadow-none" aria-busy={isLoading}>
      <CardHeader className="px-5">
        <CardTitle className="text-base" asChild>
          <h2>{t('orders.all')}</h2>
        </CardTitle>
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
                          orderSortOptions.find((item) => item.value === value)?.value ?? 'newest',
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
                      className="min-w-[960px] table-fixed"
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
                        <col className="w-[128px]" />
                        <col className="w-[112px]" />
                        <col className="w-[144px]" />
                        <col className="w-[136px]" />
                        <col className="w-[72px]" />
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
                          <TableHead className="pr-5 text-right">{t('orders.total')}</TableHead>
                          <TableHead className="sticky right-0 z-10 border-l bg-muted pr-5">
                            <span className="sr-only">{editor('actionsColumn')}</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading
                          ? Array.from({ length: 6 }, (_, index) => (
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
                                    className="block h-auto max-w-full truncate p-0 font-medium text-foreground"
                                    title={order.id}
                                    aria-label={t('orders.viewOrder', { id: order.id })}
                                    onClick={(event) => {
                                      onView(order.id, event.currentTarget)
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
                                <TableCell className="pr-5 text-right font-medium wrap-anywhere whitespace-normal tabular-nums">
                                  {formatMoney(orderTotal(order) / 100)}
                                </TableCell>
                                <TableCell className="sticky right-0 z-10 border-l bg-card pr-5 group-hover/order-row:bg-muted">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={editor('actions', { id: order.id })}
                                        onFocus={(event) => {
                                          actionTrigger.current = event.currentTarget
                                        }}
                                        onPointerDown={(event) => {
                                          actionTrigger.current = event.currentTarget
                                        }}
                                      >
                                        <MoreHorizontal aria-hidden="true" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      onCloseAutoFocus={(event) => {
                                        if (hasOpenDialog) event.preventDefault()
                                      }}
                                    >
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          onView(order.id, actionTrigger.current)
                                        }}
                                      >
                                        {editor('view')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          onEdit(order)
                                        }}
                                      >
                                        <Pencil aria-hidden="true" />
                                        {editor('edit')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={() => {
                                          onDelete(order)
                                        }}
                                      >
                                        <Trash2 aria-hidden="true" />
                                        {editor('remove')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                        {!isLoading &&
                          Array.from(
                            { length: Math.max(0, 6 - visibleOrders.length) },
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
                          : hasOrders
                            ? t('orders.noMatch')
                            : t('orders.empty')}
                      </EmptyTitle>
                      <EmptyDescription>
                        {hasLoadError
                          ? errorMessage(error)
                          : hasOrders
                            ? t('common.searchHint')
                            : t('orders.emptyHint')}
                      </EmptyDescription>
                    </EmptyHeader>
                    {hasLoadError ? (
                      <Button variant="outline" onClick={onRetry}>
                        {t('common.tryAgain')}
                      </Button>
                    ) : (
                      hasOrders && (
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
                        : filteredTotal
                          ? t('orders.showing', {
                              start: formatNumber(currentPage * pageSize + 1),
                              end: formatNumber(
                                Math.min((currentPage + 1) * pageSize, filteredTotal),
                              ),
                              total: formatNumber(filteredTotal),
                            })
                          : t('orders.count', { total: formatNumber(0) })}
                  </p>
                  <HStack wrap className="gap-3">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        onSearchChange({
                          pageSize: Number(value) as OrdersSearch['pageSize'],
                          page: 1,
                        })
                      }}
                    >
                      <SelectTrigger
                        aria-label={t('common.rowsPerPage')}
                        className="w-auto min-w-24"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 12, 24].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {t('common.rowsCount', {
                              count: size,
                              formattedCount: formatNumber(size),
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
  )
}
