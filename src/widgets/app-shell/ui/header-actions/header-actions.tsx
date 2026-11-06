import { Globe, Moon, Sun } from 'lucide-react'
import { useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/lib/theme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { HStack } from '@/shared/ui/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { AccountMenu } from './account-menu'
import { CurrencyMenu } from './currency-menu'
import { HeaderActionButton } from './header-action-button'

export function HeaderActions({ onSearch }: { onSearch: () => void }) {
  const { t } = useTranslation('workspace')
  const { resolvedTheme, setTheme } = useTheme()
  const locale = useLocalePreferences((state) => state.locale)
  const setLocale = useLocalePreferences((state) => state.setLocale)

  return (
    <HStack data-slot="header-actions" wrap className="ml-auto max-w-full shrink-0 gap-1 md:gap-2">
      <HeaderActionButton
        desktopSearchLabel={t('shell.search')}
        aria-label={t('shell.searchWorkspace')}
        onClick={onSearch}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <HeaderActionButton
            aria-label={t(resolvedTheme === 'dark' ? 'shell.lightTheme' : 'shell.darkTheme')}
            onClick={() => {
              setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
            }}
          >
            {resolvedTheme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </HeaderActionButton>
        </TooltipTrigger>
        <TooltipContent>{t('shell.toggleTheme')}</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <HeaderActionButton aria-label={t('shell.language')}>
                <Globe aria-hidden="true" />
              </HeaderActionButton>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('shell.language')}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t('shell.language')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => {
              if (value === 'ko-KR' || value === 'en-US') setLocale(value)
            }}
          >
            <DropdownMenuRadioItem value="ko-KR" lang="ko">
              한국어
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en-US" lang="en">
              English
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <CurrencyMenu />
      <AccountMenu />
    </HStack>
  )
}
