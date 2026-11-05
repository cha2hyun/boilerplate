import { Archive, Circle, Pause } from 'lucide-react'
import type { Project } from '@/entities/project'
import { useTranslation } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'

const statusKeys = {
  active: 'common.active',
  paused: 'common.paused',
  archived: 'common.archived',
} as const

export function ProjectStatusBadge({ status }: { status: Project['status'] }) {
  const { t } = useTranslation('workspace')
  const Icon = status === 'active' ? Circle : status === 'paused' ? Pause : Archive
  return (
    <Badge
      variant={status === 'active' ? 'default' : status === 'paused' ? 'secondary' : 'outline'}
      className="gap-1.5 font-normal"
    >
      <Icon aria-hidden="true" className="size-3" />
      {t(statusKeys[status])}
    </Badge>
  )
}
