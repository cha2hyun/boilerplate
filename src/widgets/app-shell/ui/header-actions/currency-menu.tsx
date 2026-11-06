import { useState } from 'react'
import { Banknote, LoaderCircle, RefreshCw } from 'lucide-react'
import { useExchangeRate } from '@/entities/exchange-rate'
import { useFormatters, useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { HeaderActionButton } from './header-action-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { HStack } from '@/shared/ui/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export function CurrencyMenu() {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useFormatters()
  const currency = useLocalePreferences((state) => state.currency)
  const setCurrency = useLocalePreferences((state) => state.setCurrency)
  const exchangeRate = useExchangeRate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setMenuOpen(open)
        if (open) setTooltipOpen(false)
      }}
    >
      <Tooltip open={tooltipOpen && !menuOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <HeaderActionButton aria-label={t('shell.currency')}>
              <Banknote aria-hidden="true" />
            </HeaderActionButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('shell.currency')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="w-64 max-w-[calc(100vw-2rem)]"
        aria-describedby="exchange-rate-status"
      >
        <DropdownMenuLabel>{t('shell.currency')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={currency}
          onValueChange={(value) => {
            if (value === 'USD' || value === 'KRW') setCurrency(value)
          }}
        >
          <DropdownMenuRadioItem value="USD">{t('shell.currencyUsd')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="KRW">{t('shell.currencyKrw')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <div
          id="exchange-rate-status"
          role="status"
          aria-live="polite"
          className="px-2 py-2 text-xs leading-relaxed text-muted-foreground tabular-nums"
        >
          {exchangeRate.data ? (
            t('shell.exchangeRate', {
              rate: formatNumber(exchangeRate.data.rate, {
                style: 'currency',
                currency: 'KRW',
                maximumFractionDigits: 2,
              }),
            })
          ) : exchangeRate.isPending ? (
            <HStack asChild className="inline-flex gap-1.5">
              <span>
                <LoaderCircle
                  className="size-3 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {t('shell.exchangeRateLoading')}
              </span>
            </HStack>
          ) : (
            t('shell.exchangeRateUnavailable')
          )}
        </div>
        {exchangeRate.isError && (
          <DropdownMenuItem
            disabled={exchangeRate.isFetching}
            onSelect={(event) => {
              event.preventDefault()
              void exchangeRate.refetch()
            }}
          >
            <RefreshCw aria-hidden="true" />
            {t('shell.retryExchangeRate')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
