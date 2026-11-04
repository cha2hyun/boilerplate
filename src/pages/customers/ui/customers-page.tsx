import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Repeat2,
  Search,
  UserCheck,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react'
import { customersQueryOptions, customerStatuses, type CustomerStatus } from '@/entities/customer'
import { MoneyDisplay, NumberDisplay } from '@/features/number-motion'
import {
  useErrorMessage,
  useFormatters,
  useLocalePreferences,
  useTranslation,
} from '@/shared/lib/i18n'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { compareCustomers, customerSortOptions, type CustomerSort } from '../model/sample-customers'

const pageSize = 6
const countFormat = { maximumFractionDigits: 0 }

function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const { t } = useTranslation('admin')
  return (
    <Badge variant={status === 'Active' ? 'secondary' : 'outline'} className="font-normal">
      {t(`customers.status.${status}`)}
    </Badge>
  )
}

export function CustomersPage() {
  const { t } = useTranslation('admin')
  const errorMessage = useErrorMessage()
  const { formatNumber, formatMoney, formatDate } = useFormatters()
  const currency = useLocalePreferences((state) => state.currency)
  const customersQuery = useQuery(customersQueryOptions())
  const customers = customersQuery.data ?? []
  const isLoading = customersQuery.isPending && !customersQuery.data
  const hasLoadError = customersQuery.isError && !customersQuery.data
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all')
  const [sort, setSort] = useState<CustomerSort>('newest')
  const [page, setPage] = useState(0)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const selectedCustomer = customers.find((item) => item.id === selectedCustomerId)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const query = search.trim().toLowerCase()
  const filteredCustomers = customers
    .filter(
      (customer) =>
        (status === 'all' || customer.status === status) &&
        `${customer.name} ${customer.email} ${customer.country} ${customer.city}`
          .toLowerCase()
          .includes(query),
    )
    .sort((left, right) => compareCustomers(left, right, sort))
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleCustomers = filteredCustomers.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  )
  const hasFilters = search !== '' || status !== 'all' || sort !== 'newest'

  // A refreshed response may remove the selected record; keep only valid UI selection.
  if (selectedCustomerId !== null && customersQuery.data && !selectedCustomer) {
    setSelectedCustomerId(null)
  }

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setSort('newest')
    setPage(0)
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  const summaries = [
    {
      title: t('customers.summary.total'),
      value: customers.length,
      description: t('customers.summary.totalHint'),
      Icon: Users,
    },
    {
      title: t('customers.summary.active'),
      value: customers.filter((customer) => customer.status === 'Active').length,
      description: t('customers.summary.activeHint'),
      Icon: UserCheck,
    },
    {
      title: t('customers.summary.returning'),
      value: customers.filter((customer) => customer.orders > 1).length,
      description: t('customers.summary.returningHint'),
      Icon: Repeat2,
    },
    {
      title: t('customers.summary.firstTime'),
      value: customers.filter((customer) => customer.orders === 1).length,
      description: t('customers.summary.firstTimeHint'),
      Icon: UserRoundPlus,
    },
  ]

  return (
    <VStack align="stretch" className="min-w-0 gap-6">
      <VStack align="stretch" className="gap-1.5">
        <HStack wrap className="gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{t('customers.title')}</h1>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {t('common.sample')}
          </Badge>
        </HStack>
        <p className="text-sm text-muted-foreground">{t('customers.intro')}</p>
      </VStack>

      {customersQuery.isError && customersQuery.data && (
        <Alert variant="destructive">
          <AlertTitle>{t('customers.refreshError')}</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(customersQuery.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void customersQuery.refetch()}>
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
                  ) : customersQuery.data ? (
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
          <CardTitle className="text-base">{t('customers.directory')}</CardTitle>
          <CardDescription>{t('customers.directoryHint')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="min-w-0 gap-4 px-0">
          <CardContent>
            <HStack wrap className="gap-2 px-5">
              <div className="relative w-full md:max-w-xs">
                <Search
                  className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Label htmlFor="customers-search" className="sr-only">
                  {t('customers.search')}
                </Label>
                <Input
                  id="customers-search"
                  ref={searchRef}
                  placeholder={t('customers.searchPlaceholder')}
                  value={search}
                  className="pl-9"
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(0)
                  }}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(customerStatuses.find((item) => item === value) ?? 'all')
                  setPage(0)
                }}
              >
                <SelectTrigger aria-label={t('customers.filterStatus')} className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('customers.allStatuses')}</SelectItem>
                  {customerStatuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`customers.status.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(
                    customerSortOptions.find((item) => item.value === value)?.value ?? 'newest',
                  )
                  setPage(0)
                }}
              >
                <SelectTrigger aria-label={t('customers.sortLabel')} className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customerSortOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {t(`customers.sort.${item.value}`)}
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
            {isLoading || visibleCustomers.length ? (
              <div
                role="region"
                aria-label={t('customers.table')}
                aria-busy={isLoading}
                className="h-120 min-w-0 border-y"
              >
                <Table className="min-w-200 table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[12%]" />
                    <col className="w-[20%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="pl-5">{t('common.customer')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('customers.location')}</TableHead>
                      <TableHead className="text-right">{t('customers.orders')}</TableHead>
                      <TableHead className="text-right">{t('customers.spent')}</TableHead>
                      <TableHead className="pr-5">{t('customers.joined')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: pageSize }, (_, index) => (
                          <TableRow key={index} className="h-18" aria-hidden="true">
                            {Array.from({ length: 6 }, (_, cell) => (
                              <TableCell key={cell} className="px-5">
                                <Skeleton className="h-4 w-full max-w-28" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : visibleCustomers.map((customer) => (
                          <TableRow key={customer.id} className="h-18">
                            <TableCell className="py-2 pl-5">
                              <HStack className="min-w-0 gap-3">
                                <Avatar className="size-8 shrink-0">
                                  <AvatarFallback className="text-xs font-medium">
                                    {customer.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <VStack align="stretch" className="min-w-0 flex-1">
                                  <Button
                                    variant="link"
                                    className="block h-auto max-w-full truncate p-0 text-left font-medium text-foreground"
                                    title={customer.name}
                                    aria-label={t('customers.viewCustomer', {
                                      name: customer.name,
                                    })}
                                    onClick={(event) => {
                                      detailTrigger.current = event.currentTarget
                                      setSelectedCustomerId(customer.id)
                                    }}
                                  >
                                    {customer.name}
                                  </Button>
                                  <p
                                    className="truncate text-xs text-muted-foreground"
                                    title={customer.email}
                                  >
                                    {customer.email}
                                  </p>
                                </VStack>
                              </HStack>
                            </TableCell>
                            <TableCell>
                              <CustomerStatusBadge status={customer.status} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {customer.country}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNumber(customer.orders)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatMoney(customer.spent / 100)}
                            </TableCell>
                            <TableCell className="pr-5 text-muted-foreground">
                              {formatDate(customer.joined, { year: 'numeric' })}
                            </TableCell>
                          </TableRow>
                        ))}
                    {!isLoading &&
                      Array.from(
                        { length: Math.max(0, pageSize - visibleCustomers.length) },
                        (_, index) => (
                          <TableRow
                            key={`empty-${String(index)}`}
                            className="h-18 hover:bg-transparent"
                            aria-hidden="true"
                          >
                            <TableCell colSpan={6} />
                          </TableRow>
                        ),
                      )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty
                className="h-120 rounded-none border-y py-12"
                role={hasLoadError ? 'alert' : undefined}
              >
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {hasLoadError
                      ? t('customers.loadError')
                      : customers.length
                        ? t('customers.noMatch')
                        : t('customers.empty')}
                  </EmptyTitle>
                  <EmptyDescription>
                    {hasLoadError
                      ? errorMessage(customersQuery.error)
                      : customers.length
                        ? t('common.searchHint')
                        : t('customers.emptyHint')}
                  </EmptyDescription>
                </EmptyHeader>
                {hasLoadError ? (
                  <Button variant="outline" onClick={() => void customersQuery.refetch()}>
                    {t('common.tryAgain')}
                  </Button>
                ) : (
                  customers.length > 0 && (
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
                  ? t('customers.loading')
                  : hasLoadError
                    ? t('customers.loadError')
                    : filteredCustomers.length
                      ? t('customers.showing', {
                          start: formatNumber(currentPage * pageSize + 1),
                          end: formatNumber(
                            Math.min((currentPage + 1) * pageSize, filteredCustomers.length),
                          ),
                          total: formatNumber(filteredCustomers.length),
                        })
                      : t('customers.count', { total: formatNumber(0) })}
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
                    aria-label={t('customers.previousPage')}
                    disabled={isLoading || currentPage === 0}
                    onClick={() => {
                      setPage(currentPage - 1)
                    }}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    aria-label={t('customers.nextPage')}
                    disabled={isLoading || currentPage + 1 >= pageCount}
                    onClick={() => {
                      setPage(currentPage + 1)
                    }}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </HStack>
              </HStack>
            </div>
          </CardContent>
        </VStack>
      </Card>

      <Sheet
        open={selectedCustomer !== undefined}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomerId(null)
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
            <SheetTitle className="break-words">
              {selectedCustomer?.name ?? t('customers.details')}
            </SheetTitle>
            <SheetDescription>
              {selectedCustomer
                ? t('customers.sampleProfile', { id: selectedCustomer.id })
                : t('customers.detailsHint')}
            </SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <VStack align="stretch" className="@container/customer-details gap-6 px-6 pb-6 text-sm">
              <HStack className="gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="font-medium">
                    {selectedCustomer.initials}
                  </AvatarFallback>
                </Avatar>
                <VStack align="start" className="min-w-0 gap-1.5">
                  <p className="break-all text-muted-foreground">{selectedCustomer.email}</p>
                  <CustomerStatusBadge status={selectedCustomer.status} />
                </VStack>
              </HStack>
              <div className="grid grid-cols-1 gap-3 @xs/customer-details:grid-cols-2">
                <Card className="gap-2 py-4 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-xs font-normal text-muted-foreground">
                      {t('customers.lifetimeOrders')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 text-2xl font-semibold tabular-nums">
                    <NumberDisplay animate value={selectedCustomer.orders} format={countFormat} />
                  </CardContent>
                </Card>
                <Card className="gap-2 py-4 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-xs font-normal text-muted-foreground">
                      {t('customers.currencySpent', { currency })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 text-xl font-semibold tabular-nums">
                    <MoneyDisplay animate value={selectedCustomer.spent / 100} />
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
                          {selectedCustomer.city}, {selectedCustomer.country}
                        </dd>
                      </VStack>
                      <VStack align="stretch" className="gap-1">
                        <dt className="text-xs text-muted-foreground">{t('customers.since')}</dt>
                        <dd>{formatDate(selectedCustomer.joined, { year: 'numeric' })}</dd>
                      </VStack>
                      <VStack align="stretch" className="gap-1">
                        <dt className="text-xs text-muted-foreground">
                          {t('customers.lastOrder')}
                        </dt>
                        <dd>
                          {selectedCustomer.lastOrder
                            ? formatDate(selectedCustomer.lastOrder, { year: 'numeric' })
                            : t('customers.noOrders')}
                        </dd>
                      </VStack>
                      <VStack align="stretch" className="gap-1">
                        <dt className="text-xs text-muted-foreground">{t('customers.type')}</dt>
                        <dd>
                          {selectedCustomer.orders > 1
                            ? t('customers.returningCustomer')
                            : t('customers.firstTimeCustomer')}
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
    </VStack>
  )
}
