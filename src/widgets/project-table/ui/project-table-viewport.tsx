import { flexRender, type Table as TableModel } from '@tanstack/react-table'
import { FolderKanban, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import type { Project } from '@/entities/project'
import { TableColumnControls, type TableView } from '@/features/table-view'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface ProjectTableViewportProps {
  table: TableModel<Project>
  compact: boolean
  view?: TableView
  showLoading: boolean
  showError: boolean
  hasFilters: boolean
  onClearFilters: () => void
  onRetry?: () => void
}

export function ProjectTableViewport({
  table,
  compact,
  view,
  showLoading,
  showError,
  hasFilters,
  onClearFilters,
  onRetry,
}: ProjectTableViewportProps) {
  const { t } = useTranslation('workspace')
  return (
    <>
      {/* The viewport stays stable through loading, density changes, and empty/error states. */}
      <div
        data-project-table-viewport
        className={`relative overflow-auto [&>[data-slot=table-container]]:overflow-visible ${compact ? 'h-[25rem]' : 'h-[38.5rem]'}`}
      >
        <Table
          aria-label={t(compact ? 'table.recent' : 'common.projects')}
          className={compact ? 'min-w-[44rem] table-fixed' : undefined}
          columnWidths={view?.columnWidths}
          density={view?.density}
          pinnedWidth={view?.pinnedWidth}
        >
          <TableHeader className="sticky top-0 z-20 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    data-column-id={header.column.id}
                    aria-label={
                      view?.columns.find((column) => column.id === header.column.id)?.label
                    }
                    layout={view?.getLayout(header.column.id)}
                    className={
                      !compact
                        ? header.column.id === 'select'
                          ? 'pl-5 md:pl-6'
                          : header.column.id === 'actions'
                            ? 'pr-5 md:pr-6'
                            : ''
                        : header.column.id === 'select'
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
                                    : header.column.id === 'name'
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
                    {header.isPlaceholder ? null : view ? (
                      <HStack justify="between" className="gap-1">
                        <span className="min-w-0 wrap-anywhere whitespace-normal">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        <TableColumnControls view={view} columnId={header.column.id} />
                      </HStack>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showLoading
              ? Array.from({ length: compact ? 5 : 8 }, (_, index) => (
                  <TableRow key={index} className="h-18" aria-hidden="true">
                    {table.getLeafHeaders().map(({ column }) => (
                      <TableCell
                        key={column.id}
                        data-column-id={column.id}
                        layout={view?.getLayout(column.id)}
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
                          data-column-id={cell.column.id}
                          layout={view?.getLayout(cell.column.id)}
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
                <Button variant="outline" onClick={onClearFilters}>
                  {t('table.clearFilters')}
                </Button>
              ) : null}
            </Empty>
          </div>
        )}
      </div>
    </>
  )
}
