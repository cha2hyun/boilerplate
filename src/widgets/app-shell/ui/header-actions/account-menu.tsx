import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CircleUserRound, LogIn, LogOut, RefreshCw, Settings2 } from 'lucide-react'
import { workspaceUserQueryOptions } from '@/entities/workspace-user'
import { useDemoSession } from '@/features/demo-session'
import { env } from '@/shared/config'
import { useTranslation } from '@/shared/lib/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { HeaderActionButton } from './header-action-button'

export function AccountMenu() {
  const session = useDemoSession()
  const { t } = useTranslation('workspace')
  if (env.dataSource !== 'demo') return null
  if (!session) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <HeaderActionButton asChild aria-label={t('account.signIn')}>
            <Link to="/login">
              <LogIn aria-hidden="true" />
            </Link>
          </HeaderActionButton>
        </TooltipTrigger>
        <TooltipContent>{t('account.signIn')}</TooltipContent>
      </Tooltip>
    )
  }
  return <SignedInAccountMenu userId={session.id} />
}

function SignedInAccountMenu({ userId }: { userId: string }) {
  const { t } = useTranslation('workspace')
  const profile = useQuery(workspaceUserQueryOptions(userId))
  const user = profile.data
  const identityId = useId()
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <HeaderActionButton
              aria-label={t('account.menu')}
              accountProfile={{
                name: user?.name ?? '',
                nickname: user?.nickname,
                src: user?.avatarUrl,
                pending: profile.isPending,
              }}
            />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent>{t('account.menu')}</TooltipContent>}
      </Tooltip>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 max-w-[calc(100vw-2rem)]"
        aria-describedby={identityId}
      >
        <HStack asChild className="min-w-0 gap-3">
          <DropdownMenuLabel id={identityId} className="py-2">
            <ProfileAvatar
              name={user?.name ?? ''}
              src={user?.avatarUrl}
              pending={profile.isPending}
              size="lg"
            />
            <VStack align="stretch" className="min-w-0 flex-1 gap-0.5">
              {user ? (
                <>
                  <span className="font-semibold wrap-anywhere">{user.name}</span>
                  <span className="text-xs font-normal wrap-anywhere text-muted-foreground">
                    {user.email}
                  </span>
                </>
              ) : profile.isPending ? (
                <>
                  <span className="sr-only">{t('account.loading')}</span>
                  <Skeleton aria-hidden="true" className="my-1 h-3 w-20 max-w-full" />
                  <Skeleton aria-hidden="true" className="my-1 h-2 w-32 max-w-full" />
                </>
              ) : (
                <span className="text-sm font-normal wrap-anywhere text-muted-foreground">
                  {t(profile.isError ? 'account.error' : 'account.missing')}
                </span>
              )}
            </VStack>
          </DropdownMenuLabel>
        </HStack>
        {!user && !profile.isPending && (
          <DropdownMenuItem
            className="min-h-9 pointer-coarse:min-h-11"
            disabled={profile.isFetching}
            onSelect={(event) => {
              event.preventDefault()
              void profile.refetch()
            }}
          >
            <RefreshCw aria-hidden="true" />
            {t('common.retry')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-9 pointer-coarse:min-h-11">
          <Link to="/account">
            <CircleUserRound aria-hidden="true" />
            {t('account.title')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-9 pointer-coarse:min-h-11">
          <Link to="/settings">
            <Settings2 aria-hidden="true" />
            {t('account.workspaceSettings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive" className="min-h-9 pointer-coarse:min-h-11">
          <Link to="/login" state={{ demoSignOut: true }} replace preload={false}>
            <LogOut aria-hidden="true" />
            {t('account.signOut')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
