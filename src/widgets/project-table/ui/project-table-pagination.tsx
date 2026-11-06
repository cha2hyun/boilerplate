import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { Project } from '@/entities/project'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { HStack, VStack } from '@/shared/ui/stack'

interface ProjectTablePaginationProps {
  table: Table<Project>
  showLoading: boolean
  showError: boolean
  isLoading: boolean
}

export function ProjectTablePagination({
  table,
  showLoading,
  showError,
  isLoading,
}: ProjectTablePaginationProps) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useFormatters()
  const filteredCount = table.getFilteredRowModel().rows.length
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const pageCount = Math.max(1, table.getPageCount())
  const pageIndex = table.getState().pagination.pageIndex
  return (
    <VStack
      align="stretch"
      justify="center"
      className="min-h-24 gap-3 border-t px-5 py-4 text-sm md:min-h-16 md:flex-row md:items-center md:justify-between md:px-6"
    >
      <p className="min-w-0 text-xs wrap-anywhere text-muted-foreground" aria-live="polite">
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
                    start: formatNumber(pageIndex * table.getState().pagination.pageSize + 1),
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
      <HStack wrap className="min-w-0 gap-4 md:gap-6">
        <HStack className="hidden gap-2 md:flex">
          <Label htmlFor="projects-page-size" className="text-xs font-normal text-muted-foreground">
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
  )
}
