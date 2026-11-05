import { useMemo, type RefObject } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { Project } from '@/entities/project'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Progress } from '@/shared/ui/progress'
import { HStack } from '@/shared/ui/stack'
import { ProjectStatusBadge } from './project-status-badge'

interface ProjectColumnsOptions {
  compact: boolean
  actionTriggerRef: RefObject<HTMLElement | null>
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
}

export function useProjectColumns({
  compact,
  actionTriggerRef,
  onEdit,
  onDelete,
}: ProjectColumnsOptions) {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatDate } = useFormatters()
  return useMemo<ColumnDef<Project>[]>(
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
                  onEdit(row.original)
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
        cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />,
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
                  onEdit(row.original)
                }}
              >
                <Pencil aria-hidden="true" /> {t('common.editProject')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  onDelete(row.original)
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
    [compact, t, formatNumber, formatDate, actionTriggerRef, onEdit, onDelete],
  )
}
