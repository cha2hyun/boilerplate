import type { ReactNode } from 'react'
import { useExchangeRate } from '@/entities/exchange-rate'
import { ExchangeRateContext } from '@/shared/lib/i18n/exchange-rate-context'

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const exchangeRate = useExchangeRate()
  return (
    <ExchangeRateContext value={exchangeRate.data?.rate ?? null}>{children}</ExchangeRateContext>
  )
}
