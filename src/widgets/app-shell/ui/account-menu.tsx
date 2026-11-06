import { Link } from '@tanstack/react-router'
import { CircleUserRound, LogIn, LogOut } from 'lucide-react'
import { useDemoSession } from '@/features/demo-session'
import { env } from '@/shared/config'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
          <Button asChild variant="ghost" size="icon-sm">
            <Link to="/login" aria-label={t('account.signIn')}>
              <LogIn aria-hidden="true" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('account.signIn')}</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('account.menu')}>
              <CircleUserRound aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('account.menu')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
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
