import { useRef, useState } from 'react'
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
  compareOrders,
  formatOrderAmount,
  formatOrderDate,
  orderSortOptions,
  orderStatuses,
  orderSubtotal,
  orderTotal,
  sampleOrders,
  type OrderSort,
  type OrderStatus,
  type SampleOrder,
} from '../model/sample-orders'

const pageSize = 6

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant={
        status === 'Delivered' ? 'default' : status === 'Cancelled' ? 'outline' : 'secondary'
      }
      className="font-normal"
    >
      {status}
    </Badge>
  )
}

export function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [sort, setSort] = useState<OrderSort>('newest')
  const [page, setPage] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<SampleOrder | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const query = search.trim().toLowerCase()
  const filteredOrders = sampleOrders
    .filter(
      (order) =>
        (status === 'all' || order.status === status) &&
        `${order.id} ${order.customer.name} ${order.customer.email}`.toLowerCase().includes(query),
    )
    .sort((left, right) => compareOrders(left, right, sort))
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const visibleOrders = filteredOrders.slice(page * pageSize, (page + 1) * pageSize)
  const hasFilters = search !== '' || status !== 'all' || sort !== 'newest'

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setSort('newest')
    setPage(0)
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  const summaries = [
    {
      title: 'Total orders',
      value: sampleOrders.length,
      description: 'Oct 25 – Nov 3, 2026',
      Icon: Package,
    },
    {
      title: 'Processing',
      value: sampleOrders.filter((order) => order.status === 'Processing').length,
      description: 'Preparing for the next step',
      Icon: Clock3,
    },
    {
      title: 'Shipped',
      value: sampleOrders.filter((order) => order.status === 'Shipped').length,
      description: 'On the way to customers',
      Icon: Truck,
    },
    {
      title: 'Delivered',
      value: sampleOrders.filter((order) => order.status === 'Delivered').length,
      description: 'Completed sample orders',
      Icon: CheckCheck,
    },
  ]

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Sample
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Explore order activity, fulfillment, and details with read-only sample data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaries.map(({ title, value, description, Icon }) => (
          <Card key={title} className="gap-3 py-5 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-1 px-5">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-w-0 gap-5 overflow-hidden shadow-none">
        <CardHeader className="px-5">
          <CardTitle className="text-base">All orders</CardTitle>
          <CardDescription>Browse 12 sample orders. Amounts are shown in USD.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 px-0">
          <Tabs
            value={status}
            onValueChange={(value) => {
              setStatus(orderStatuses.find((item) => item === value) ?? 'all')
              setPage(0)
            }}
            className="min-w-0 gap-4"
          >
            <div className="px-5">
              <TabsList
                aria-label="Filter orders by status"
                className="max-w-full flex-wrap justify-start group-data-[orientation=horizontal]/tabs:h-auto"
              >
                <TabsTrigger value="all" className="h-8 flex-none px-3">
                  All orders
                </TabsTrigger>
                {orderStatuses.map((item) => (
                  <TabsTrigger key={item} value={item} className="h-8 flex-none px-3">
                    {item}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value={status} className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2 px-5">
                <div className="relative w-full md:max-w-xs">
                  <Search
                    className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Label htmlFor="orders-search" className="sr-only">
                    Search orders
                  </Label>
                  <Input
                    id="orders-search"
                    ref={searchRef}
                    placeholder="Search orders or customers…"
                    value={search}
                    className="pl-9"
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(0)
                    }}
                  />
                </div>
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    setSort(
                      orderSortOptions.find((item) => item.value === value)?.value ?? 'newest',
                    )
                    setPage(0)
                  }}
                >
                  <SelectTrigger aria-label="Sort orders" className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderSortOptions.map((item) => (
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
              {visibleOrders.length ? (
                <div role="region" aria-label="Orders table" className="min-w-0 border-y">
                  <Table className="min-w-190">
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="pl-5">Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="pr-5 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="py-4 pl-5">
                            <Button
                              variant="link"
                              className="h-auto p-0 font-medium text-foreground"
                              aria-label={`View order ${order.id}`}
                              onClick={(event) => {
                                detailTrigger.current = event.currentTarget
                                setSelectedOrder(order)
                                setDetailsOpen(true)
                              }}
                            >
                              {order.id}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarFallback className="text-xs font-medium">
                                  {order.customer.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{order.customer.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.customer.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{order.payment}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatOrderDate(order.date)}
                          </TableCell>
                          <TableCell className="pr-5 text-right font-medium tabular-nums">
                            {formatOrderAmount(orderTotal(order))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty className="border-y py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No matching orders</EmptyTitle>
                    <EmptyDescription>
                      Try another customer, order number, or status.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                </Empty>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {filteredOrders.length
                    ? `Showing ${String(page * pageSize + 1)}–${String(Math.min((page + 1) * pageSize, filteredOrders.length))} of ${String(filteredOrders.length)} orders`
                    : '0 orders'}
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium tabular-nums">
                    Page {page + 1} of {pageCount}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      aria-label="Previous orders page"
                      disabled={page === 0}
                      onClick={() => {
                        setPage(page - 1)
                      }}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      aria-label="Next orders page"
                      disabled={page + 1 >= pageCount}
                      onClick={() => {
                        setPage(page + 1)
                      }}
                    >
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          className="w-full overflow-y-auto md:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            detailTrigger.current?.focus()
          }}
        >
          <SheetHeader className="border-b p-6 pr-12">
            <SheetTitle>{selectedOrder ? `Order ${selectedOrder.id}` : 'Order details'}</SheetTitle>
            <SheetDescription>
              {selectedOrder
                ? `Placed ${formatOrderDate(selectedOrder.date)} · Sample order`
                : 'Read-only sample order details'}
            </SheetDescription>
          </SheetHeader>
          {selectedOrder && (
            <div className="space-y-6 px-6 pb-6 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <OrderStatusBadge status={selectedOrder.status} />
                <span className="text-muted-foreground">Payment: {selectedOrder.payment}</span>
              </div>
              <section className="space-y-3" aria-label="Order items">
                <h2 className="font-medium">Items</h2>
                <ul className="divide-y rounded-lg border px-4">
                  {selectedOrder.items.map((item) => (
                    <li key={item.name} className="flex items-start justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.quantity} × {formatOrderAmount(item.unitPrice)}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {formatOrderAmount(item.quantity * item.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="space-y-2">
                  <div className="flex justify-between gap-3 text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">
                      {formatOrderAmount(orderSubtotal(selectedOrder))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 text-muted-foreground">
                    <dt>Shipping</dt>
                    <dd className="tabular-nums">{formatOrderAmount(selectedOrder.shipping)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-2 font-semibold">
                    <dt>Total (USD)</dt>
                    <dd className="tabular-nums">{formatOrderAmount(orderTotal(selectedOrder))}</dd>
                  </div>
                </dl>
              </section>
              <Separator />
              <section className="space-y-3" aria-label="Order customer">
                <h2 className="font-medium">Customer</h2>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{selectedOrder.customer.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium">{selectedOrder.customer.name}</p>
                    <p className="break-all text-muted-foreground">
                      {selectedOrder.customer.email}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Delivery destination: {selectedOrder.city}, {selectedOrder.country}
                </p>
              </section>
              <Separator />
              <p className="text-xs leading-relaxed text-muted-foreground">
                This is a sample record for exploring the interface. No payment or shipment is
                processed.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
