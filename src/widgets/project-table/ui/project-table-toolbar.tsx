import type { RefObject } from 'react'
import type { Table } from '@tanstack/react-table'
import { ArrowDownToLine, ListFilter, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Project } from '@/entities/project'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { HStack, VStack } from '@/shared/ui/stack'
import { projectTableSearchSchema, type ProjectTableSearch } from '../model/search'
import { exportProjects } from '../lib/export-projects'

const columnKeys = {
  name: 'table.project',
  status: 'common.status',
  owner: 'table.owner',
  progress: 'table.progress',
  updatedAt: 'table.updated',
} as const

interface ProjectTableToolbarProps {
  table: Table<Project>
  compact: boolean
  projectCount: number | undefined
  search: ProjectTableSearch
  onSearchChange: SearchChange<ProjectTableSearch>
  searchRef: RefObject<HTMLInputElement | null>
  hasFilters: boolean
  onClearFilters: () => void
  showLoading: boolean
  showError: boolean
  showRefreshError: boolean
  onRetry?: () => void
}

export function ProjectTableToolbar({
  table,
  compact,
  projectCount,
  search,
  onSearchChange,
  searchRef,
  hasFilters,
  onClearFilters,
  showLoading,
  showError,
  showRefreshError,
  onRetry,
}: ProjectTableToolbarProps) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useFormatters()
  const filteredCount = table.getFilteredRowModel().rows.length
  const selectedRows = table.getFilteredSelectedRowModel().rows
  return (
    <CardHeader className="border-b px-5 py-5 md:px-6">
      <HStack justify="between" wrap className="gap-3">
        <VStack align="stretch" className="min-w-0 flex-1 gap-1">
          <HStack asChild wrap className="min-h-6 gap-2 text-base">
            <CardTitle asChild>
              <h2>
                <span className="min-w-0 wrap-anywhere">
                  {t(compact ? 'table.recent' : 'table.all')}
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 min-w-6 shrink-0 justify-center font-normal tabular-nums"
                >
                  {formatNumber(projectCount)}
                </Badge>
              </h2>
            </CardTitle>
          </HStack>
          <HStack asChild wrap className="min-h-8 gap-2">
            <CardDescription aria-live="polite">
              <span className="min-w-0 flex-1 wrap-anywhere">
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
            onClick={onClearFilters}
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
  )
}
