import type { WorkspaceUserStatus } from '@/entities/workspace-user'
import { useTranslation } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'

const variants = { active: 'secondary', invited: 'outline', suspended: 'destructive' } as const

export function UserStatusBadge({ status }: { status: WorkspaceUserStatus }) {
  const { t } = useTranslation('workspaceUsers')
  return (
    <Badge className="max-w-full whitespace-normal" variant={variants[status]}>
      {t(`statuses.${status}`)}
    </Badge>
  )
}
