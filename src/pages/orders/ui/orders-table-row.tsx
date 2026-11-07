import type { ReactNode, RefObject } from 'react'
import type { SampleOrder } from '@/entities/order'
import type { TableView } from '@/features/table-view'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { HStack, VStack } from '@/shared/ui/stack'
import { TableCell, TableRow } from '@/shared/ui/table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { orderTotal } from '../model/sample-orders'
import { OrderStatusBadge } from './order-status-badge'

interface OrdersTableRowProps {
  order: SampleOrder
  view: TableView
  actionTrigger: RefObject<HTMLButtonElement | null>
  hasOpenDialog: boolean
  onView: (id: string, trigger: HTMLButtonElement | null) => void
  onEdit: (record: SampleOrder) => void
  onDelete: (record: SampleOrder) => void
}

const cellClasses: Record<string, string> = {
  id: 'py-2 pl-5',
  payment: 'text-muted-foreground',
  date: 'text-muted-foreground',
  total: 'pr-5 text-right font-medium wrap-anywhere whitespace-normal tabular-nums',
  actions: 'pr-5',
}

export function OrdersTableRow({
  order,
  view,
  actionTrigger: actionTriggerRef,
  hasOpenDialog,
  onView,
  onEdit,
  onDelete,
}: OrdersTableRowProps) {
  const { t } = useTranslation('admin')
  const { t: editor } = useTranslation('orderEditor')
  const { formatMoney, formatDate } = useFormatters()
  const content: Record<string, ReactNode> = {
    id: (
      <Button
        variant="link"
        className="block h-auto max-w-full truncate p-0 font-medium text-foreground"
        title={order.id}
        aria-label={t('orders.viewOrder', { id: order.id })}
        onClick={(event) => {
          onView(order.id, event.currentTarget)
        }}
      >
        {order.id}
      </Button>
    ),
    customer: (
      <HStack className="min-w-0 gap-3">
        <ProfileAvatar
          name={order.customer.name}
          src={order.customer.avatarUrl}
          initials={order.customer.initials}
          className="size-8 shrink-0"
          fallbackClassName="text-xs font-medium"
        />
        <VStack align="stretch" className="min-w-0 flex-1">
          <p className="truncate font-medium" title={order.customer.name}>
            {order.customer.name}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={order.customer.email}>
            {order.customer.email}
          </p>
        </VStack>
      </HStack>
    ),
    status: <OrderStatusBadge status={order.status} />,
    payment: t(`orders.paymentStatus.${order.payment}`),
    date: formatDate(order.date, { year: 'numeric' }),
    total: formatMoney(orderTotal(order) / 100),
    actions: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={editor('actions', { id: order.id })}
            onFocus={(event) => {
              actionTriggerRef.current = event.currentTarget
            }}
            onPointerDown={(event) => {
              actionTriggerRef.current = event.currentTarget
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
              onView(order.id, actionTriggerRef.current)
            }}
          >
            {editor('view')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              onEdit(order)
            }}
          >
            <Pencil aria-hidden="true" />
            {editor('edit')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              onDelete(order)
            }}
          >
            <Trash2 aria-hidden="true" />
            {editor('remove')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }
  return (
    <TableRow className="group/order-row h-18 hover:bg-muted">
      {view.visibleColumns.map((column) => (
        <TableCell
          key={column.id}
          data-column-id={column.id}
          layout={view.getLayout(column.id)}
          className={cellClasses[column.id]}
        >
          {content[column.id]}
        </TableCell>
      ))}
    </TableRow>
  )
}
