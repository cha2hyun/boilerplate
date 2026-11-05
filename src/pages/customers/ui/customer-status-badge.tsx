import { type CustomerStatus } from '@/entities/customer'
import { useTranslation } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const { t } = useTranslation('admin')
  return (
    <Badge variant={status === 'Active' ? 'secondary' : 'outline'} className="font-normal">
      {t(`customers.status.${status}`)}
    </Badge>
  )
}
