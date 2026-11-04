import { useLocalePreferences } from '@/shared/lib/i18n/preferences'
import { useUsdKrwRate } from '@/shared/lib/i18n/exchange-rate-context'
import { convertUsdAmount, type MoneyFormatOptions } from '@/shared/lib/i18n/money'
import { NumberDisplay } from './number-display'

interface MoneyDisplayProps {
  value: number | null | undefined
  format?: MoneyFormatOptions
  animate?: boolean
  className?: string
}

export function MoneyDisplay({ value, format, ...props }: MoneyDisplayProps) {
  const currency = useLocalePreferences((state) => state.currency)
  const rate = useUsdKrwRate()
  return (
    <NumberDisplay
      value={convertUsdAmount(value, currency, rate)}
      format={{ ...format, style: 'currency', currency }}
      {...props}
    />
  )
}
