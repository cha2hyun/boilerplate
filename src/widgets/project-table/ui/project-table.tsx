import { useEffect, useMemo, useRef, useState } from 'react'
import {
  functionalUpdate,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import type { Project } from '@/entities/project'
import { ProjectDeleteDialog, ProjectEditorDialog } from '@/features/project-editor'
import { useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Card, CardContent } from '@/shared/ui/card'
import { projectTableSearchSchema, type ProjectTableSearch } from '../model/search'
import { useProjectColumns } from './use-project-columns'
import { ProjectTableToolbar } from './project-table-toolbar'
import { ProjectTableViewport } from './project-table-viewport'
import { ProjectTablePagination } from './project-table-pagination'

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

  const columns = useProjectColumns({
    compact,
    actionTriggerRef,
    onEdit: setEditingProject,
    onDelete: setDeletingProject,
  })

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

  const hasFilters = Boolean(search.q || columnFilters.length)
  const pageCount = Math.max(1, table.getPageCount())

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
        <ProjectTableToolbar
          table={table}
          compact={compact}
          projectCount={hasData ? projects.length : undefined}
          search={search}
          onSearchChange={onSearchChange}
          searchRef={searchRef}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          showLoading={showLoading}
          showError={showError}
          showRefreshError={showRefreshError}
          onRetry={onRetry}
        />
        <CardContent className="px-0">
          <ProjectTableViewport
            table={table}
            compact={compact}
            showLoading={showLoading}
            showError={showError}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            onRetry={onRetry}
          />
          {!compact && (
            <ProjectTablePagination
              table={table}
              showLoading={showLoading}
              showError={showError}
              isLoading={isLoading}
            />
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
