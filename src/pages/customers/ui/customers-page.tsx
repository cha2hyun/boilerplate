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
import { NumberDisplay } from '@/features/number-motion'
import { formatNumber } from '@/shared/lib/format'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import {
  compareCustomers,
  customerSortOptions,
  formatCustomerAmount,
  formatCustomerDate,
  type CustomerSort,
} from '../model/sample-customers'

const pageSize = 6
const countFormat = { maximumFractionDigits: 0 }

function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge variant={status === 'Active' ? 'secondary' : 'outline'} className="font-normal">
      {status}
    </Badge>
  )
}

export function CustomersPage() {
  const customersQuery = useQuery(customersQueryOptions())
  const customers = customersQuery.data ?? []
  const isLoading = customersQuery.isPending && !customersQuery.data
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
      title: 'Total customers',
      value: customers.length,
      description: 'Across the sample directory',
      Icon: Users,
    },
    {
      title: 'Active customers',
      value: customers.filter((customer) => customer.status === 'Active').length,
      description: 'With an active sample profile',
      Icon: UserCheck,
    },
    {
      title: 'Returning customers',
      value: customers.filter((customer) => customer.orders > 1).length,
      description: 'More than one sample order',
      Icon: Repeat2,
    },
    {
      title: 'First-time customers',
      value: customers.filter((customer) => customer.orders === 1).length,
      description: 'One sample order so far',
      Icon: UserRoundPlus,
    },
  ]

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Sample
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Get to know your customer directory with read-only sample profiles.
        </p>
      </div>

      {customersQuery.isError && customersQuery.data && (
        <Alert variant="destructive">
          <AlertTitle>Customers couldn't refresh</AlertTitle>
          <AlertDescription>
            <p>{customersQuery.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void customersQuery.refetch()}>
              Try again
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
            <CardHeader className="flex flex-row items-center justify-between px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-1 px-5">
              <div className="flex h-9 items-center text-3xl font-semibold tracking-tight tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : customersQuery.data ? (
                  <NumberDisplay animate value={value} format={countFormat} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-w-0 gap-5 overflow-hidden shadow-none" aria-busy={isLoading}>
        <CardHeader className="px-5">
          <CardTitle className="text-base">Customer directory</CardTitle>
          <CardDescription>
            Search profiles, compare order activity, and view customer details.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 px-0">
          <div className="flex flex-wrap items-center gap-2 px-5">
            <div className="relative w-full md:max-w-xs">
              <Search
                className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Label htmlFor="customers-search" className="sr-only">
                Search customers
              </Label>
              <Input
                id="customers-search"
                ref={searchRef}
                placeholder="Search name, email, or location…"
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
              <SelectTrigger aria-label="Filter customers by status" className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {customerStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(customerSortOptions.find((item) => item.value === value)?.value ?? 'newest')
                setPage(0)
              }}
            >
              <SelectTrigger aria-label="Sort customers" className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customerSortOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
          {isLoading || visibleCustomers.length ? (
            <div
              role="region"
              aria-label="Customers table"
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
                    <TableHead className="pl-5">Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total spent</TableHead>
                    <TableHead className="pr-5">Joined</TableHead>
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
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="size-8 shrink-0">
                                <AvatarFallback className="text-xs font-medium">
                                  {customer.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <Button
                                  variant="link"
                                  className="block h-auto max-w-full truncate p-0 text-left font-medium text-foreground"
                                  title={customer.name}
                                  aria-label={`View customer ${customer.name}`}
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
                              </div>
                            </div>
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
                            {formatCustomerAmount(customer.spent)}
                          </TableCell>
                          <TableCell className="pr-5 text-muted-foreground">
                            {formatCustomerDate(customer.joined)}
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
            <Empty className="h-120 rounded-none border-y py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {customersQuery.isError && !customersQuery.data
                    ? 'Customers couldn’t load'
                    : customers.length
                      ? 'No matching customers'
                      : 'No customers yet'}
                </EmptyTitle>
                <EmptyDescription>
                  {customersQuery.isError && !customersQuery.data
                    ? customersQuery.error.message
                    : customers.length
                      ? 'Try another search or status.'
                      : 'Customers will appear here when available.'}
                </EmptyDescription>
              </EmptyHeader>
              {customersQuery.isError && !customersQuery.data ? (
                <Button variant="outline" onClick={() => void customersQuery.refetch()}>
                  Try again
                </Button>
              ) : (
                customers.length > 0 && (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                )
              )}
            </Empty>
          )}
          <div className="grid gap-3 px-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {isLoading
                ? 'Loading customers…'
                : filteredCustomers.length
                  ? `Showing ${formatNumber(currentPage * pageSize + 1)}–${formatNumber(Math.min((currentPage + 1) * pageSize, filteredCustomers.length))} of ${formatNumber(filteredCustomers.length)} customers`
                  : `${formatNumber(0)} customers`}
            </p>
            <div className="flex items-center gap-3">
              <p className="text-xs font-medium tabular-nums">
                Page {formatNumber(currentPage + 1)} of {formatNumber(pageCount)}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="Previous customers page"
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
                  aria-label="Next customers page"
                  disabled={isLoading || currentPage + 1 >= pageCount}
                  onClick={() => {
                    setPage(currentPage + 1)
                  }}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
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
              {selectedCustomer?.name ?? 'Customer details'}
            </SheetTitle>
            <SheetDescription>
              {selectedCustomer
                ? `${selectedCustomer.id} · Sample customer profile`
                : 'Read-only sample customer details'}
            </SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <div className="space-y-6 px-6 pb-6 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="font-medium">
                    {selectedCustomer.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1.5">
                  <p className="break-all text-muted-foreground">{selectedCustomer.email}</p>
                  <CustomerStatusBadge status={selectedCustomer.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card className="gap-2 py-4 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-xs font-normal text-muted-foreground">
                      Lifetime orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 text-2xl font-semibold tabular-nums">
                    <NumberDisplay animate value={selectedCustomer.orders} format={countFormat} />
                  </CardContent>
                </Card>
                <Card className="gap-2 py-4 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-xs font-normal text-muted-foreground">
                      Total spent (USD)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 text-xl font-semibold tabular-nums">
                    <NumberDisplay
                      animate
                      value={selectedCustomer.spent / 100}
                      format={{ style: 'currency', currency: 'USD' }}
                    />
                  </CardContent>
                </Card>
              </div>
              <section className="space-y-4" aria-label="Customer information">
                <h2 className="font-medium">Customer information</h2>
                <dl className="space-y-4">
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground">Location</dt>
                    <dd>
                      {selectedCustomer.city}, {selectedCustomer.country}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground">Customer since</dt>
                    <dd>{formatCustomerDate(selectedCustomer.joined)}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground">Last order</dt>
                    <dd>
                      {selectedCustomer.lastOrder
                        ? formatCustomerDate(selectedCustomer.lastOrder)
                        : 'No orders yet'}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground">Customer type</dt>
                    <dd>
                      {selectedCustomer.orders > 1 ? 'Returning customer' : 'First-time customer'}
                    </dd>
                  </div>
                </dl>
              </section>
              <Separator />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sample lifetime totals illustrate a customer profile and are independent of the
                sample orders list. No customer account or email action is connected.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
