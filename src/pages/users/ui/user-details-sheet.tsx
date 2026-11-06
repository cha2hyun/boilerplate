import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import {
  currentDemoUserId,
  workspaceUserQueryOptions,
  type WorkspaceUser,
} from '@/entities/workspace-user'
import { useTranslation } from '@/shared/lib/i18n'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { UserStatusBadge } from './user-status-badge'
import { UsersQueryAlert } from './users-query-alert'

interface DetailsProps {
  id: string
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
  onEdit: (user: WorkspaceUser, trigger: HTMLButtonElement) => void
}

export function UserDetailsSheet({ id, onClose, onCloseAutoFocus, onEdit }: DetailsProps) {
  const { t } = useTranslation('workspaceUsers')
  const query = useQuery(workspaceUserQueryOptions(id))
  const user = query.data
  return (
    <Sheet
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        className="w-full overflow-y-auto md:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader className="border-b p-6 pr-12">
          <HStack className="min-w-0 gap-3">
            {(user != null || query.isPending) && (
              <ProfileAvatar
                name={user?.name ?? ''}
                src={user?.avatarUrl}
                pending={query.isPending}
              />
            )}
            <SheetTitle className="min-w-0 wrap-anywhere">{user?.name ?? t('details')}</SheetTitle>
          </HStack>
          <SheetDescription>{t('detailHint')}</SheetDescription>
        </SheetHeader>
        <VStack align="stretch" className="min-w-0 gap-5 px-6 pb-6">
          {query.isPending && (
            <VStack align="stretch" className="gap-3" aria-busy="true">
              <span className="sr-only" role="status">
                {t('detailLoading')}
              </span>
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-2/3" />
            </VStack>
          )}
          {query.isError && (
            <UsersQueryAlert
              heading={t(user === undefined ? 'detailError' : 'detailRefreshError')}
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
          {user === null && (
            <VStack align="start" className="gap-2">
              <h2 className="font-semibold">{t('notFound')}</h2>
              <p className="text-sm text-muted-foreground">{t('notFoundHint')}</p>
              <Button variant="outline" onClick={onClose}>
                {t('back')}
              </Button>
            </VStack>
          )}
          {user && (
            <>
              <dl className="grid min-w-0 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">{t('fields.email')}</dt>
                  <dd className="mt-1 wrap-anywhere">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">{t('fields.role')}</dt>
                  <dd className="mt-1 wrap-anywhere">{t(`roles.${user.role}`)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">{t('fields.status')}</dt>
                  <dd className="mt-1">
                    <UserStatusBadge status={user.status} />
                  </dd>
                </div>
              </dl>
              {user.id === currentDemoUserId ? (
                <p className="border-t pt-4 text-sm text-muted-foreground">{t('selfProtected')}</p>
              ) : (
                <Button
                  className="h-auto min-h-9 w-fit max-w-full whitespace-normal"
                  variant="outline"
                  onClick={(event) => {
                    onEdit(user, event.currentTarget)
                  }}
                >
                  <Pencil aria-hidden="true" />
                  {t('edit')}
                </Button>
              )}
            </>
          )}
        </VStack>
      </SheetContent>
    </Sheet>
  )
}
