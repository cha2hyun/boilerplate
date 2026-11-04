import { useState } from 'react'
import { Coins, LoaderCircle, RefreshCw } from 'lucide-react'
import { useExchangeRate } from '@/entities/exchange-rate'
import { useFormatters, useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export function CurrencyMenu() {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatDate } = useFormatters()
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
            <Button variant="ghost" size="icon" className="size-8" aria-label={t('shell.currency')}>
              <Coins className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('shell.currency')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="w-72 max-w-[calc(100vw-2rem)]"
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
        <div className="space-y-2 px-2 py-2 text-xs leading-relaxed text-muted-foreground">
          <div id="exchange-rate-status" role="status" aria-live="polite" className="tabular-nums">
            {exchangeRate.data ? (
              t('shell.exchangeRate', {
                rate: formatNumber(exchangeRate.data.rate, {
                  style: 'currency',
                  currency: 'KRW',
                  maximumFractionDigits: 2,
                }),
                date: formatDate(exchangeRate.data.date, { year: 'numeric' }),
              })
            ) : exchangeRate.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <LoaderCircle
                  className="size-3 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {t('shell.exchangeRateLoading')}
              </span>
            ) : (
              t('shell.exchangeRateUnavailable')
            )}
          </div>
          <p>{t('shell.exchangeRateDescription')}</p>
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
