import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  Archive,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  FolderKanban,
  ListFilter,
  MoreHorizontal,
  Pause,
  Pencil,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Project } from '@/entities/project'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { projectTableSearchSchema, type ProjectTableSearch } from '../model/search'
import { ProjectDeleteDialog, ProjectEditorDialog } from '@/features/project-editor'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface ProjectTableProps {
  search: ProjectTableSearch
  onSearchChange: SearchChange<ProjectTableSearch>
  projects: Project[]
  isLoading?: boolean
  isFetching?: boolean
  hasData?: boolean
  compact?: boolean
  error?: Error | null
  onRetry?: () => void
}

const statusKeys = {
  active: 'common.active',
  paused: 'common.paused',
  archived: 'common.archived',
} as const

const columnKeys = {
  name: 'table.project',
  status: 'common.status',
  owner: 'table.owner',
  progress: 'table.progress',
  updatedAt: 'table.updated',
} as const

function StatusBadge({ status }: { status: Project['status'] }) {
  const { t } = useTranslation('workspace')
  const Icon = status === 'active' ? Circle : status === 'paused' ? Pause : Archive
  return (
    <Badge
      variant={status === 'active' ? 'default' : status === 'paused' ? 'secondary' : 'outline'}
      className="gap-1.5 font-normal"
    >
      <Icon aria-hidden="true" className="size-3" />
      {t(statusKeys[status])}
    </Badge>
  )
}

function exportProjects(
  projects: Project[],
  labels: { headers: string[]; statuses: Record<Project['status'], string>; success: string },
) {
  function escapeCell(value: string | number) {
    const text = String(value)
    const safe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }

  const rows = projects.map((project) => [
    project.name,
    project.description,
    labels.statuses[project.status],
    project.owner.name,
    project.owner.email,
    project.progress,
    project.updatedAt,
  ])
  const csv = [labels.headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `blueprint-projects-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
  toast.success(labels.success)
}

export function ProjectTable({
  search,
  onSearchChange,
  projects,
  isLoading = false,
  isFetching = false,
  hasData = projects.length > 0,
  compact = false,
  error,
  onRetry,
}: ProjectTableProps) {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatDate } = useFormatters()
  const showLoading = isLoading && !hasData
  const showError = Boolean(error) && !hasData
  const showRefreshError = Boolean(error) && hasData
  const sorting = useMemo<SortingState>(
    () => [{ id: search.sort, desc: search.order === 'desc' }],
    [search.sort, search.order],
  )
  const columnFilters = useMemo<ColumnFiltersState>(
    () => (search.status === 'all' ? [] : [{ id: 'status', value: search.status }]),
    [search.status],
  )
  const pagination = useMemo(
    () => ({ pageIndex: search.page - 1, pageSize: compact ? 5 : search.pageSize }),
    [search.page, search.pageSize, compact],
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const tableRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const actionTriggerRef = useRef<HTMLElement | null>(null)

  function restoreActionFocus(event: Event) {
    event.preventDefault()
    const target = actionTriggerRef.current?.isConnected
      ? actionTriggerRef.current
      : tableRef.current
    target?.focus()
  }

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      ...(!compact
        ? [
            {
              id: 'select',
              header: ({ table }) => (
                <Checkbox
                  className="size-6"
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={(value) => {
                    table.toggleAllPageRowsSelected(Boolean(value))
                  }}
                  aria-label={t('table.selectAll')}
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  className="size-6"
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => {
                    row.toggleSelected(Boolean(value))
                  }}
                  aria-label={t('table.selectProject', { name: row.original.name })}
                />
              ),
              enableSorting: false,
              enableHiding: false,
              enableGlobalFilter: false,
            } satisfies ColumnDef<Project>,
          ]
        : []),
      {
        accessorKey: 'name',
        header: ({ column }) => {
          const direction = column.getIsSorted()
          const Icon =
            direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown
          return (
            <Button
              variant="ghost"
              size="sm"
              className={compact ? '-ml-3 h-8' : 'h-8'}
              onClick={() => {
                column.toggleSorting(direction === 'asc')
              }}
            >
              {t('table.project')} <Icon className="size-3.5" aria-hidden="true" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <HStack className="min-w-0 gap-3">
            <HStack
              justify="center"
              className="size-9 shrink-0 rounded-lg border bg-muted/50 text-muted-foreground"
            >
              <FolderKanban className="size-4" aria-hidden="true" />
            </HStack>
            <div className="min-w-0 flex-1">
              <Button
                variant="link"
                className="h-auto max-w-full justify-start truncate p-0 text-left font-medium text-foreground"
                onClick={(event) => {
                  actionTriggerRef.current = event.currentTarget
                  setEditingProject(row.original)
                }}
              >
                {row.original.name}
              </Button>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.description || t('table.noDescription')}
              </p>
            </div>
          </HStack>
        ),
        enableHiding: false,
      },
      {
        accessorKey: 'status',
        header: t('common.status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        filterFn: 'equals',
        enableGlobalFilter: false,
      },
      {
        id: 'owner',
        accessorFn: (project) => project.owner.name,
        header: t('table.owner'),
        cell: ({ row }) => (
          <HStack className="gap-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{row.original.owner.initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm whitespace-nowrap">{row.original.owner.name}</span>
          </HStack>
        ),
        enableGlobalFilter: false,
      },
      {
        accessorKey: 'progress',
        header: ({ column }) => {
          const direction = column.getIsSorted()
          const Icon =
            direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown
          return (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => {
                column.toggleSorting(direction === 'asc')
              }}
            >
              {t('table.progress')} <Icon className="size-3.5" aria-hidden="true" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <HStack className="w-28 gap-2.5">
            <Progress
              value={row.original.progress}
              className="h-1.5 flex-1"
              aria-label={t('table.projectProgress', { name: row.original.name })}
            />
            <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
              {formatNumber(row.original.progress, { style: 'percent', maximumFractionDigits: 0 })}
            </span>
          </HStack>
        ),
        enableGlobalFilter: false,
      },
      {
        id: 'updatedAt',
        accessorFn: (project) => Date.parse(project.updatedAt),
        sortingFn: 'basic',
        header: ({ column }) => {
          const direction = column.getIsSorted()
          const Icon =
            direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown
          return (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => {
                column.toggleSorting(direction === 'asc')
              }}
            >
              {t('table.updated')} <Icon className="size-3.5" aria-hidden="true" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.updatedAt, { year: 'numeric' })}
          </span>
        ),
        enableGlobalFilter: false,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t('table.projectActionsLabel', { name: row.original.name })}
                onFocus={(event) => {
                  actionTriggerRef.current = event.currentTarget
                }}
                onPointerDown={(event) => {
                  actionTriggerRef.current = event.currentTarget
                }}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('table.projectActions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setEditingProject(row.original)
                }}
              >
                <Pencil aria-hidden="true" /> {t('common.editProject')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setDeletingProject(row.original)
                }}
              >
                <Trash2 aria-hidden="true" /> {t('common.deleteProject')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
      },
    ],
    [compact, t, formatNumber, formatDate],
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- Table v8 owns its state and React Compiler is not enabled.
  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility: compact ? { ...columnVisibility, updatedAt: false } : columnVisibility,
      rowSelection,
      globalFilter: search.q,
    },
    getRowId: (project) => project.id,
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sorting)[0]
      if (!next) return
      onSearchChange({
        sort: projectTableSearchSchema.shape.sort.parse(next.id),
        order: next.desc ? 'desc' : 'asc',
        page: 1,
      })
    },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination)
      onSearchChange({
        page: next.pageSize === pagination.pageSize ? next.pageIndex + 1 : 1,
        pageSize: projectTableSearchSchema.shape.pageSize.parse(next.pageSize),
      })
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, _columnId, value: string) =>
      [
        row.original.name,
        row.original.description,
        row.original.owner.name,
        row.original.owner.email,
      ]
        .join(' ')
        .toLowerCase()
        .includes(value.trim().toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // URL pagination must survive the first response and browser history navigation.
    autoResetPageIndex: false,
  })

  const filteredCount = table.getFilteredRowModel().rows.length
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const hasFilters = Boolean(search.q || columnFilters.length)
  const pageCount = Math.max(1, table.getPageCount())
  const pageIndex = table.getState().pagination.pageIndex

  useEffect(() => {
    if (hasData && !isLoading && !isFetching && !error && search.page > pageCount) {
      onSearchChange({ page: pageCount }, { replace: true })
    }
  }, [hasData, isLoading, isFetching, error, search.page, pageCount, onSearchChange])

  function clearFilters() {
    onSearchChange({ q: '', status: 'all', page: 1 })
    searchRef.current?.focus()
  }

  return (
    <>
      <Card
        ref={tableRef}
        tabIndex={-1}
        aria-label={t(compact ? 'table.recent' : 'table.all')}
        aria-busy={showLoading}
        className="gap-0 overflow-hidden py-0 shadow-none"
      >
        <CardHeader className="border-b px-5 py-5 md:px-6">
          <HStack justify="between" wrap className="gap-3">
            <VStack align="stretch" className="min-w-0 flex-1 gap-1">
              <HStack asChild className="h-6 gap-2 text-base">
                <CardTitle>
                  <span className="truncate">{t(compact ? 'table.recent' : 'table.all')}</span>
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-6 shrink-0 justify-center font-normal tabular-nums"
                  >
                    {formatNumber(hasData ? projects.length : undefined)}
                  </Badge>
                </CardTitle>
              </HStack>
              <HStack asChild className="h-8 gap-2">
                <CardDescription aria-live="polite">
                  <span className="min-w-0 flex-1 truncate">
                    {showRefreshError
                      ? t('table.refreshError')
                      : compact
                        ? t('table.recentDescription')
                        : t('table.allDescription')}
                  </span>
                  {showRefreshError && onRetry && (
                    <Button variant="outline" size="sm" className="shrink-0" onClick={onRetry}>
                      <RefreshCw aria-hidden="true" /> {t('common.retry')}
                    </Button>
                  )}
                </CardDescription>
              </HStack>
            </VStack>
            {!compact && (
              <Button
                variant="outline"
                size="sm"
                disabled={showLoading || showError || filteredCount === 0}
                onClick={() => {
                  const exportedProjects = (
                    selectedRows.length ? selectedRows : table.getFilteredRowModel().rows
                  ).map((row) => row.original)
                  exportProjects(exportedProjects, {
                    headers: [
                      t('table.project'),
                      t('editor.description'),
                      t('common.status'),
                      t('table.owner'),
                      t('table.ownerEmail'),
                      t('table.progressPercent'),
                      t('table.updated'),
                    ],
                    statuses: {
                      active: t('common.active'),
                      paused: t('common.paused'),
                      archived: t('common.archived'),
                    },
                    success: t('table.exported', {
                      count: exportedProjects.length,
                      formattedCount: formatNumber(exportedProjects.length),
                    }),
                  })
                }}
              >
                <ArrowDownToLine aria-hidden="true" />
                {selectedRows.length
                  ? t('table.exportSelected', { formattedCount: formatNumber(selectedRows.length) })
                  : t('table.export')}
              </Button>
            )}
          </HStack>
          {!compact && (
            <HStack wrap className="mt-4 gap-2">
              <div className="relative min-w-48 flex-1 md:max-w-80">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  ref={searchRef}
                  aria-label={t('table.search')}
                  placeholder={t('table.searchPlaceholder')}
                  value={search.q}
                  maxLength={200}
                  onChange={(event) => {
                    onSearchChange({ q: event.target.value, page: 1 }, { replace: true })
                  }}
                  className="h-9 pl-9"
                />
              </div>
              <Select
                value={search.status}
                onValueChange={(value) => {
                  onSearchChange({
                    status: projectTableSearchSchema.shape.status.parse(value),
                    page: 1,
                  })
                }}
              >
                <SelectTrigger className="w-36" aria-label={t('table.filterStatus')}>
                  <ListFilter className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <SelectValue placeholder={t('table.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('table.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="paused">{t('common.paused')}</SelectItem>
                  <SelectItem value="archived">{t('common.archived')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className={hasFilters ? undefined : 'invisible'}
                aria-hidden={!hasFilters}
                disabled={!hasFilters}
                onClick={clearFilters}
              >
                <X aria-hidden="true" /> {t('table.reset')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <SlidersHorizontal aria-hidden="true" /> {t('table.view')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('table.toggleColumns')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => {
                          column.toggleVisibility(value)
                        }}
                        onSelect={(event) => {
                          event.preventDefault()
                        }}
                      >
                        {column.id in columnKeys
                          ? t(columnKeys[column.id as keyof typeof columnKeys])
                          : column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </HStack>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {/* Keep a 40px header plus five/eight 72px rows in every request state. */}
          <div
            data-project-table-viewport
            className={`relative overflow-auto [&>[data-slot=table-container]]:overflow-visible ${compact ? 'h-[25rem]' : 'h-[38.5rem]'}`}
          >
            <Table
              aria-label={t(compact ? 'table.recent' : 'common.projects')}
              className={compact ? 'min-w-[44rem] table-fixed' : 'min-w-[58rem] table-fixed'}
            >
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.id === 'select'
                            ? 'w-12 pl-5 md:pl-6'
                            : header.column.id === 'status'
                              ? 'w-28'
                              : header.column.id === 'owner'
                                ? 'w-44'
                                : header.column.id === 'progress'
                                  ? 'w-36'
                                  : header.column.id === 'updatedAt'
                                    ? 'w-36'
                                    : header.column.id === 'actions'
                                      ? 'w-12 pr-5 md:pr-6'
                                      : compact && header.column.id === 'name'
                                        ? 'pl-5 md:pl-6'
                                        : ''
                        }
                        aria-sort={
                          header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : header.column.getIsSorted() === 'desc'
                              ? 'descending'
                              : undefined
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {showLoading
                  ? Array.from({ length: compact ? 5 : 8 }, (_, index) => (
                      <TableRow key={index} className="h-18" aria-hidden="true">
                        {table.getVisibleLeafColumns().map((column) => (
                          <TableCell
                            key={column.id}
                            className={`py-4 ${column.id === 'select' ? 'pl-5 md:pl-6' : column.id === 'actions' ? 'pr-5 md:pr-6' : compact && column.id === 'name' ? 'pl-5 md:pl-6' : ''}`}
                          >
                            {column.id === 'name' ? (
                              <HStack className="gap-3">
                                <Skeleton className="size-9 shrink-0 rounded-lg" />
                                <VStack align="stretch" className="min-w-0 flex-1 gap-1">
                                  <Skeleton className="h-4 w-40 max-w-full" />
                                  <Skeleton className="h-3 w-48 max-w-full" />
                                </VStack>
                              </HStack>
                            ) : (
                              <Skeleton
                                className={
                                  column.id === 'select'
                                    ? 'size-6'
                                    : column.id === 'actions'
                                      ? 'size-8'
                                      : 'h-5 w-20'
                                }
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : !showError
                    ? table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="h-18"
                          data-state={row.getIsSelected() ? 'selected' : undefined}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={`py-4 ${cell.column.id === 'select' ? 'pl-5 md:pl-6' : cell.column.id === 'actions' ? 'pr-5 md:pr-6' : compact && cell.column.id === 'name' ? 'pl-5 md:pl-6' : ''}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : null}
              </TableBody>
            </Table>
            {!showLoading && (showError || !table.getRowModel().rows.length) && (
              <div className="absolute inset-x-0 top-10 bottom-0 overflow-y-auto">
                <Empty className="min-h-full" role={showError ? 'alert' : 'status'}>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      {showError ? (
                        <TriangleAlert aria-hidden="true" />
                      ) : hasFilters ? (
                        <Search aria-hidden="true" />
                      ) : (
                        <FolderKanban aria-hidden="true" />
                      )}
                    </EmptyMedia>
                    <EmptyTitle>
                      {showError
                        ? t('table.errorTitle')
                        : hasFilters
                          ? t('table.noMatching')
                          : t('table.emptyTitle')}
                    </EmptyTitle>
                    <EmptyDescription>
                      {showError
                        ? t('table.errorDescription')
                        : hasFilters
                          ? t('table.noMatchingDescription')
                          : t('table.emptyDescription')}
                    </EmptyDescription>
                  </EmptyHeader>
                  {showError && onRetry ? (
                    <Button variant="outline" onClick={onRetry}>
                      <RefreshCw aria-hidden="true" /> {t('common.retry')}
                    </Button>
                  ) : hasFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      {t('table.clearFilters')}
                    </Button>
                  ) : null}
                </Empty>
              </div>
            )}
          </div>
          {!compact && (
            <VStack
              align="stretch"
              justify="center"
              className="h-24 gap-3 border-t px-5 py-4 text-sm md:h-16 md:flex-row md:items-center md:justify-between md:px-6"
            >
              <p className="min-w-0 truncate text-xs text-muted-foreground" aria-live="polite">
                {showLoading
                  ? t('table.loading')
                  : showError
                    ? t('table.unavailable')
                    : selectedRows.length
                      ? t('table.selected', {
                          selected: formatNumber(selectedRows.length),
                          total: formatNumber(filteredCount),
                        })
                      : filteredCount
                        ? t('table.showing', {
                            start: formatNumber(
                              pageIndex * table.getState().pagination.pageSize + 1,
                            ),
                            end: formatNumber(
                              Math.min(
                                (pageIndex + 1) * table.getState().pagination.pageSize,
                                filteredCount,
                              ),
                            ),
                            total: formatNumber(filteredCount),
                          })
                        : t('table.count', { count: 0, formattedCount: formatNumber(0) })}
              </p>
              <HStack className="gap-4 md:gap-6">
                <HStack className="hidden gap-2 md:flex">
                  <Label
                    htmlFor="projects-page-size"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {t('table.rowsPerPage')}
                  </Label>
                  <Select
                    value={String(table.getState().pagination.pageSize)}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value))
                    }}
                  >
                    <SelectTrigger id="projects-page-size" className="h-8 w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[8, 16, 32].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {formatNumber(size)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HStack>
                <p className="text-xs font-medium whitespace-nowrap tabular-nums">
                  {t('table.page', {
                    page: formatNumber(pageIndex + 1),
                    total: formatNumber(pageCount),
                  })}
                </p>
                <HStack className="gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden size-8 md:inline-flex"
                    onClick={() => {
                      table.setPageIndex(0)
                    }}
                    disabled={!table.getCanPreviousPage() || isLoading}
                    aria-label={t('table.firstPage')}
                  >
                    <ChevronsLeft aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      table.previousPage()
                    }}
                    disabled={!table.getCanPreviousPage() || isLoading}
                    aria-label={t('table.previousPage')}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      table.nextPage()
                    }}
                    disabled={!table.getCanNextPage() || isLoading}
                    aria-label={t('table.nextPage')}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden size-8 md:inline-flex"
                    onClick={() => {
                      table.setPageIndex(table.getPageCount() - 1)
                    }}
                    disabled={!table.getCanNextPage() || isLoading}
                    aria-label={t('table.lastPage')}
                  >
                    <ChevronsRight aria-hidden="true" />
                  </Button>
                </HStack>
              </HStack>
            </VStack>
          )}
        </CardContent>
      </Card>
      <ProjectEditorDialog
        open={Boolean(editingProject)}
        project={editingProject ?? undefined}
        onCloseAutoFocus={restoreActionFocus}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null)
        }}
      />
      <ProjectDeleteDialog
        open={Boolean(deletingProject)}
        project={deletingProject}
        onCloseAutoFocus={restoreActionFocus}
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null)
        }}
      />
    </>
  )
}
