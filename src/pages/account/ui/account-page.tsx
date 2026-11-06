import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { workspaceUserQueryOptions } from '@/entities/workspace-user'
import { useTranslation } from '@/shared/lib/i18n'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'

export function AccountPage({ userId }: { userId: string }) {
  const { t } = useTranslation('workspace')
  const { t: users } = useTranslation('workspaceUsers')
  const profile = useQuery(workspaceUserQueryOptions(userId))
  const user = profile.data
  return (
    <VStack align="stretch" data-slot="page-content" className="gap-6">
      <PageHeader
        title={t('account.title')}
        description={t('account.description')}
        badgeLabel={t('common.sample')}
      />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle asChild>
            <h2>{t('account.profile')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VStack align="stretch" className="gap-4">
            {(user != null || profile.isPending) && (
              <HStack className="min-w-0 gap-3" aria-busy={profile.isPending}>
                <ProfileAvatar
                  name={user?.name ?? ''}
                  src={user?.avatarUrl}
                  pending={profile.isPending}
                  size="lg"
                />
                {user ? (
                  <span className="min-w-0 font-medium wrap-anywhere">{user.name}</span>
                ) : (
                  <>
                    <span role="status" className="sr-only">
                      {t('account.loading')}
                    </span>
                    <Skeleton aria-hidden="true" className="h-5 w-28" />
                  </>
                )}
              </HStack>
            )}
            {(profile.isError || user === null) && (
              <Alert>
                <AlertDescription>
                  {user === null ? t('account.missing') : t('account.error')}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void profile.refetch()
                    }}
                  >
                    {t('common.retry')}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {user && (
              <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-6">
                {(
                  [
                    ...(user.givenName ? [[users('fields.givenName'), user.givenName]] : []),
                    ...(user.familyName ? [[users('fields.familyName'), user.familyName]] : []),
                    [users('fields.email'), user.email],
                    [users('fields.role'), users(`roles.${user.role}`)],
                    [users('fields.status'), users(`statuses.${user.status}`)],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="grid min-w-0 gap-1 sm:col-span-2 sm:grid-cols-subgrid"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 font-medium wrap-anywhere">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Button asChild variant="outline" className="self-start">
              <Link to="/users">{t('account.directory')}</Link>
            </Button>
          </VStack>
        </CardContent>
      </Card>
    </VStack>
  )
}
