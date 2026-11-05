import { type OrderStatus } from '@/entities/order'
import { useTranslation } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation('admin')
  return (
    <Badge
      variant={
        status === 'Delivered' ? 'default' : status === 'Cancelled' ? 'outline' : 'secondary'
      }
      className="font-normal"
    >
      {t(`orders.status.${status}`)}
    </Badge>
  )
}
