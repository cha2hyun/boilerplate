import { Boxes, Globe } from 'lucide-react'
import { product } from '@/shared/config/product'
import { useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
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

export function LoginHeader() {
  const { t } = useTranslation('demoLogin')
  const locale = useLocalePreferences((state) => state.locale)
  const setLocale = useLocalePreferences((state) => state.setLocale)
  const languageName = locale === 'ko-KR' ? '한국어' : 'English'

  return (
    <HStack
      asChild
      justify="between"
      className="min-h-[clamp(4rem,6vw,5.5rem)] shrink-0 gap-3 border-b px-[clamp(1rem,5vw,5rem)] py-2"
    >
      <header>
        <HStack className="min-w-0 gap-2">
          <HStack
            justify="center"
            className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground"
          >
            <Boxes className="size-5" aria-hidden="true" />
          </HStack>
          <span className="text-lg font-semibold tracking-tight wrap-anywhere">
            {product.wordmark}
            <span className="text-muted-foreground">.</span>
          </span>
        </HStack>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:w-auto sm:px-2"
              aria-label={`${t('language')} (${languageName})`}
            >
              <Globe aria-hidden="true" />
              <span className="hidden sm:inline">{languageName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
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
      </header>
    </HStack>
  )
}
