import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { workspaceUserQueryOptions } from '@/entities/workspace-user'
import { CircleUserRound, LogIn, LogOut } from 'lucide-react'
import { useDemoSession } from '@/features/demo-session'
import { env } from '@/shared/config'
import { useTranslation } from '@/shared/lib/i18n'
import { HeaderActionButton } from './header-action-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

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
  return (
    <DropdownMenu>
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
        <TooltipContent>{t('account.menu')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {user && (
          <DropdownMenuLabel className="max-w-64 wrap-anywhere">{user.name}</DropdownMenuLabel>
        )}
        <DropdownMenuItem asChild>
          <Link to="/account">
            <CircleUserRound aria-hidden="true" />
            {t('account.title')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/login" state={{ demoSignOut: true }} replace preload={false}>
            <LogOut aria-hidden="true" />
            {t('account.signOut')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
