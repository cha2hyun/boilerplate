import { useMemo, useRef, useState } from 'react'
import {
  flexRender,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface ProjectTableProps {
  projects: Project[]
  isLoading?: boolean
  compact?: boolean
  error?: Error | null
  onRetry?: () => void
}

const statusLabels: Record<Project['status'], string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

const columnLabels: Record<string, string> = {
  name: 'Project',
  status: 'Status',
  owner: 'Owner',
  progress: 'Progress',
  updatedAt: 'Last updated',
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function StatusBadge({ status }: { status: Project['status'] }) {
  const Icon = status === 'active' ? Circle : status === 'paused' ? Pause : Archive
  return (
    <Badge
      variant={status === 'active' ? 'default' : status === 'paused' ? 'secondary' : 'outline'}
      className="gap-1.5 font-normal"
    >
      <Icon aria-hidden="true" className="size-3" />
      {statusLabels[status]}
    </Badge>
  )
}

function exportProjects(projects: Project[]) {
  function escapeCell(value: string | number) {
    const text = String(value)
    const safe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }

  const rows = projects.map((project) => [
    project.name,
    project.description,
    statusLabels[project.status],
    project.owner.name,
    project.owner.email,
    project.progress,
    project.updatedAt,
  ])
  const csv = [
    ['Project', 'Description', 'Status', 'Owner', 'Owner email', 'Progress (%)', 'Last updated'],
    ...rows,
  ]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n')
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
  toast.success(
    `Exported ${String(projects.length)} ${projects.length === 1 ? 'project' : 'projects'}`,
  )
}

export function ProjectTable({
  projects,
  isLoading = false,
  compact = false,
  error,
  onRetry,
}: ProjectTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [search, setSearch] = useState('')
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
                  aria-label="Select all projects on this page"
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  className="size-6"
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => {
                    row.toggleSelected(Boolean(value))
                  }}
                  aria-label={`Select ${row.original.name}`}
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
              Project <Icon className="size-3.5" aria-hidden="true" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="flex min-w-52 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
              <FolderKanban className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <Button
                variant="link"
                className="h-auto max-w-72 justify-start truncate p-0 text-left font-medium text-foreground"
                onClick={(event) => {
                  actionTriggerRef.current = event.currentTarget
                  setEditingProject(row.original)
                }}
              >
                {row.original.name}
              </Button>
              <p className="max-w-72 truncate text-xs text-muted-foreground">
                {row.original.description || 'No description yet'}
              </p>
            </div>
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        filterFn: 'equals',
        enableGlobalFilter: false,
      },
      {
        id: 'owner',
        accessorFn: (project) => project.owner.name,
        header: 'Owner',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{row.original.owner.initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm whitespace-nowrap">{row.original.owner.name}</span>
          </div>
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
              Progress <Icon className="size-3.5" aria-hidden="true" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="flex w-28 items-center gap-2.5">
            <Progress
              value={row.original.progress}
              className="h-1.5 flex-1"
              aria-label={`${row.original.name} progress`}
            />
            <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
              {row.original.progress}%
            </span>
          </div>
        ),
        enableGlobalFilter: false,
      },
      {
        accessorKey: 'updatedAt',
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
              Last updated <Icon className="size-3.5" aria-hidden="true" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {dateFormatter.format(new Date(row.original.updatedAt))}
          </span>
        ),
        enableGlobalFilter: false,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions for ${row.original.name}`}
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
              <DropdownMenuLabel>Project actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setEditingProject(row.original)
                }}
              >
                <Pencil aria-hidden="true" /> Edit project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setDeletingProject(row.original)
                }}
              >
                <Trash2 aria-hidden="true" /> Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
      },
    ],
    [compact],
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- Table v8 owns its state and React Compiler is not enabled.
  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility: compact ? { ...columnVisibility, updatedAt: false } : columnVisibility,
      rowSelection,
      globalFilter: search,
    },
    getRowId: (project) => project.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setSearch,
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
    initialState: { pagination: { pageSize: compact ? 5 : 8 } },
  })

  const filteredCount = table.getFilteredRowModel().rows.length
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const hasFilters = Boolean(search || columnFilters.length)
  const pageCount = Math.max(1, table.getPageCount())
  const pageIndex = table.getState().pagination.pageIndex
  const visibleColumnCount = table.getVisibleLeafColumns().length

  function clearFilters() {
    setSearch('')
    setColumnFilters([])
    searchRef.current?.focus()
  }

  return (
    <>
      <Card
        ref={tableRef}
        tabIndex={-1}
        aria-label={compact ? 'Recent projects' : 'All projects'}
        aria-busy={isLoading}
        className="gap-0 overflow-hidden py-0 shadow-none"
      >
        <CardHeader className="border-b px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                {compact ? 'Recent projects' : 'All projects'}
                {!isLoading && !error && (
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {projects.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {compact
                  ? 'A little progress, every day.'
                  : 'Your team’s work, organized in one place.'}
              </CardDescription>
            </div>
            {!compact && (
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || Boolean(error) || filteredCount === 0}
                onClick={() => {
                  exportProjects(
                    (selectedRows.length ? selectedRows : table.getFilteredRowModel().rows).map(
                      (row) => row.original,
                    ),
                  )
                }}
              >
                <ArrowDownToLine aria-hidden="true" />
                {selectedRows.length ? `Export ${String(selectedRows.length)} selected` : 'Export'}
              </Button>
            )}
          </div>
          {!compact && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1 md:max-w-80">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  ref={searchRef}
                  aria-label="Search projects"
                  placeholder="Search projects…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                  }}
                  className="h-9 pl-9"
                />
              </div>
              <Select
                value={(table.getColumn('status')?.getFilterValue() as string | undefined) ?? 'all'}
                onValueChange={(value) => {
                  table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value)
                }}
              >
                <SelectTrigger className="w-36" aria-label="Filter by status">
                  <ListFilter className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X aria-hidden="true" /> Reset
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <SlidersHorizontal aria-hidden="true" /> View
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
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
                        {columnLabels[column.id] ?? column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {error ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Projects couldn’t be loaded</EmptyTitle>
                <EmptyDescription>
                  {error.message || 'Something went wrong while loading your projects.'}
                </EmptyDescription>
              </EmptyHeader>
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  <RefreshCw aria-hidden="true" /> Try again
                </Button>
              )}
            </Empty>
          ) : (
            <Table aria-label={compact ? 'Recent projects' : 'Projects'}>
              <TableHeader className="bg-muted/40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.id === 'select'
                            ? 'w-12 pl-5 md:pl-6'
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
                {isLoading ? (
                  Array.from({ length: compact ? 5 : 6 }, (_, index) => (
                    <TableRow key={index}>
                      {table.getVisibleLeafColumns().map((column) => (
                        <TableCell key={column.id} className="px-4 py-5">
                          <Skeleton
                            className={
                              column.id === 'name'
                                ? 'h-8 w-44'
                                : column.id === 'select' || column.id === 'actions'
                                  ? 'size-4'
                                  : 'h-5 w-20'
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
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
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={visibleColumnCount}>
                      <Empty className="py-14">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            {hasFilters ? (
                              <Search aria-hidden="true" />
                            ) : (
                              <FolderKanban aria-hidden="true" />
                            )}
                          </EmptyMedia>
                          <EmptyTitle>
                            {hasFilters
                              ? 'No matching projects'
                              : 'A fresh start for your next idea'}
                          </EmptyTitle>
                          <EmptyDescription>
                            {hasFilters
                              ? 'Try a different search or clear your filters.'
                              : 'Create your first project to start bringing your work together.'}
                          </EmptyDescription>
                        </EmptyHeader>
                        {hasFilters && (
                          <Button variant="outline" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </Empty>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!compact && !error && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4 text-sm md:px-6">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {selectedRows.length
                  ? `${String(selectedRows.length)} of ${String(filteredCount)} selected`
                  : filteredCount
                    ? `Showing ${String(pageIndex * table.getState().pagination.pageSize + 1)}–${String(Math.min((pageIndex + 1) * table.getState().pagination.pageSize, filteredCount))} of ${String(filteredCount)} projects`
                    : '0 projects'}
              </p>
              <div className="flex items-center gap-4 md:gap-6">
                <div className="hidden items-center gap-2 md:flex">
                  <Label
                    htmlFor="projects-page-size"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    Rows per page
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
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs font-medium whitespace-nowrap tabular-nums">
                  Page {pageIndex + 1} of {pageCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden size-8 md:inline-flex"
                    onClick={() => {
                      table.setPageIndex(0)
                    }}
                    disabled={!table.getCanPreviousPage() || isLoading}
                    aria-label="First page"
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
                    aria-label="Previous page"
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
                    aria-label="Next page"
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
                    aria-label="Last page"
                  >
                    <ChevronsRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
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
