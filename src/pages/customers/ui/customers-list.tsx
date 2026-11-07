import { customerStatuses, type SampleCustomer } from '@/entities/customer'
import {
  TableColumnControls,
  TableViewSettings,
  useTableView,
  type TableViewColumn,
} from '@/features/table-view'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { useErrorMessage, useFormatters, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { cn } from '@/shared/lib/utils'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Search, Trash2, X } from 'lucide-react'
import { customerSortOptions } from '../model/sample-customers'
import { customersSearchDefaults, type CustomersSearch } from '../model/search'

import type { RefObject } from 'react'
import type { selectCustomers } from '../model/selectors'
import { CustomerStatusBadge } from './customer-status-badge'

interface CustomersListProps {
  search: CustomersSearch
  onSearchChange: SearchChange<CustomersSearch>
  customers: SampleCustomer[]
  selection: ReturnType<typeof selectCustomers>
  isLoading: boolean
  hasLoadError: boolean
  error: Error | null
  onRetry: () => void
  searchRef: RefObject<HTMLInputElement | null>
  actionTrigger: RefObject<HTMLButtonElement | null>
  hasOpenDialog: boolean
  onView: (id: string, trigger: HTMLButtonElement | null) => void
  onEdit: (record: SampleCustomer) => void
  onDelete: (record: SampleCustomer) => void
}
export function CustomersList({
  search,
  onSearchChange,
  customers,
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
}: CustomersListProps) {
  const { t } = useTranslation('admin')
  const { t: editorT } = useTranslation('customerEditor')
  const { formatNumber, formatMoney, formatDate } = useFormatters()
  const errorMessage = useErrorMessage()
  const { q, status, sort, pageSize } = search
  const {
    filtered: filteredCustomers,
    pageCount,
    currentPage,
    visible: visibleCustomers,
  } = selection
  const hasFilters = q !== '' || status !== 'all' || sort !== 'newest'
  const isMobile = useIsMobile()
  const columns: TableViewColumn[] = [
    {
      id: 'customer',
      label: t('common.customer'),
      width: isMobile ? 128 : 224,
      minWidth: 128,
      hideable: false,
      pin: 'left',
    },
    { id: 'status', label: t('common.status'), width: 104, minWidth: 96 },
    { id: 'location', label: t('customers.location'), width: 144, minWidth: 112 },
    { id: 'orders', label: t('customers.orders'), width: 104, minWidth: 96 },
    { id: 'spent', label: t('customers.spent'), width: 128, minWidth: 112 },
    { id: 'joined', label: t('customers.joined'), width: 128, minWidth: 112 },
    { id: 'actions', label: editorT('actions'), width: 64, locked: true, pin: 'right' },
  ]
  const view = useTableView('customers', columns)
  const cellClasses: Record<string, string> = {
    customer: 'py-2 pl-5',
    location: 'wrap-anywhere whitespace-normal text-muted-foreground',
    orders: 'text-right wrap-anywhere whitespace-normal tabular-nums',
    spent: 'text-right font-medium wrap-anywhere whitespace-normal tabular-nums',
    joined: 'wrap-anywhere whitespace-normal text-muted-foreground',
    actions: 'pr-5',
  }
  function resetFilters() {
    onSearchChange({ ...customersSearchDefaults, pageSize, detail: search.detail })
    requestAnimationFrame(() => searchRef.current?.focus())
  }
  function renderCell(customer: SampleCustomer, columnId: string) {
    switch (columnId) {
      case 'customer':
        return (
          <HStack className="min-w-0 gap-3">
            <ProfileAvatar
              name={customer.name}
              src={customer.avatarUrl}
              initials={customer.initials}
              className="hidden size-8 shrink-0 md:flex"
              fallbackClassName="text-xs font-medium"
            />
            <VStack align="stretch" className="min-w-0 flex-1">
              <Button
                variant="link"
                className="block h-auto max-w-full truncate p-0 text-left font-medium text-foreground"
                title={customer.name}
                aria-label={t('customers.viewCustomer', { name: customer.name })}
                onClick={(event) => {
                  onView(customer.id, event.currentTarget)
                }}
              >
                {customer.name}
              </Button>
              <p className="truncate text-xs text-muted-foreground" title={customer.email}>
                {customer.email}
              </p>
            </VStack>
          </HStack>
        )
      case 'status':
        return <CustomerStatusBadge status={customer.status} />
      case 'location':
        return customer.country
      case 'orders':
        return formatNumber(customer.orders)
      case 'spent':
        return formatMoney(customer.spent / 100)
      case 'joined':
        return formatDate(customer.joined, { year: 'numeric' })
      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={editorT('actionsLabel', { name: customer.name })}
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
                  onEdit(customer)
                }}
              >
                <Pencil aria-hidden="true" /> {editorT('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  onDelete(customer)
                }}
              >
                <Trash2 aria-hidden="true" /> {editorT('remove')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      default:
        return null
    }
  }
  return (
    <Card className="min-w-0 gap-5 overflow-hidden shadow-none" aria-busy={isLoading}>
      <CardHeader className="px-5">
        <CardTitle className="text-base" asChild>
          <h2>{t('customers.directory')}</h2>
        </CardTitle>
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
                value={q}
                maxLength={200}
                className="pl-9"
                onChange={(event) => {
                  onSearchChange({ q: event.target.value, page: 1 }, { replace: true })
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                onSearchChange({
                  status: customerStatuses.find((item) => item === value) ?? 'all',
                  page: 1,
                })
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
                onSearchChange({
                  sort: customerSortOptions.find((item) => item.value === value)?.value ?? 'newest',
                  page: 1,
                })
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
            <TableViewSettings view={view} />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X aria-hidden="true" />
                {t('common.reset')}
              </Button>
            )}
          </HStack>
          {isLoading || visibleCustomers.length ? (
            <div className="h-120 min-w-0 border-y">
              <Table
                className="table-fixed"
                columnWidths={view.columnWidths}
                density={view.density}
                pinnedWidth={view.pinnedWidth}
                containerProps={{
                  role: 'region',
                  'aria-label': t('customers.table'),
                  'aria-busy': isLoading,
                  tabIndex: 0,
                  className:
                    'h-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                }}
              >
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {view.visibleColumns.map((column) => (
                      <TableHead
                        key={column.id}
                        data-column-id={column.id}
                        layout={view.getLayout(column.id)}
                        aria-label={column.label}
                        className={cn(
                          'bg-muted',
                          column.id === 'customer' && 'pl-5',
                          (column.id === 'orders' || column.id === 'spent') && 'text-right',
                        )}
                      >
                        {column.id === 'actions' ? (
                          <span className="sr-only">{column.label}</span>
                        ) : (
                          <HStack justify="between" className="min-w-0 gap-1">
                            <span className="min-w-0 wrap-anywhere whitespace-normal">
                              {column.label}
                            </span>
                            <TableColumnControls view={view} columnId={column.id} />
                          </HStack>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 6 }, (_, index) => (
                        <TableRow key={index} className="h-18" aria-hidden="true">
                          {view.visibleColumns.map((column) => (
                            <TableCell
                              key={column.id}
                              data-column-id={column.id}
                              layout={view.getLayout(column.id)}
                              className="bg-card px-5"
                            >
                              <Skeleton className="h-4 w-full max-w-28" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : visibleCustomers.map((customer) => (
                        <TableRow key={customer.id} className="group/customer-row h-18">
                          {view.visibleColumns.map((column) => (
                            <TableCell
                              key={column.id}
                              data-column-id={column.id}
                              layout={view.getLayout(column.id)}
                              className={cn(
                                'bg-card group-hover/customer-row:bg-muted',
                                cellClasses[column.id],
                              )}
                            >
                              {renderCell(customer, column.id)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  {!isLoading &&
                    Array.from({ length: Math.max(0, 6 - visibleCustomers.length) }, (_, index) => (
                      <TableRow
                        key={`empty-${String(index)}`}
                        className="h-18 hover:bg-transparent"
                        aria-hidden="true"
                      >
                        <TableCell colSpan={view.visibleColumns.length} />
                      </TableRow>
                    ))}
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
                    ? errorMessage(error)
                    : customers.length
                      ? t('common.searchHint')
                      : t('customers.emptyHint')}
                </EmptyDescription>
              </EmptyHeader>
              {hasLoadError ? (
                <Button variant="outline" onClick={onRetry}>
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
            <HStack wrap className="gap-3">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  onSearchChange({
                    pageSize: Number(value) as CustomersSearch['pageSize'],
                    page: 1,
                  })
                }}
              >
                <SelectTrigger aria-label={t('common.rowsPerPage')} className="w-auto min-w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 12, 24].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {t('common.rowsCount', { count: size, formattedCount: formatNumber(size) })}
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
                  aria-label={t('customers.previousPage')}
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
                  aria-label={t('customers.nextPage')}
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
        </CardContent>
      </VStack>
    </Card>
  )
}
