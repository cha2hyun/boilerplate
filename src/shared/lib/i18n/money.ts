import type { NumberFormatOptions } from '../format'
import type { DisplayCurrency } from './preferences'

export type MoneyFormatOptions = Omit<
  Extract<NumberFormatOptions, { style: 'currency' }>,
  'style' | 'currency'
>

/** All current demo money is USD major units at the display boundary; rates remain Query data. */
export function convertUsdAmount(
  amount: number | null | undefined,
  currency: DisplayCurrency,
  usdKrwRate: number | null,
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null
  if (currency === 'USD') return amount
  if (usdKrwRate === null || !Number.isFinite(usdKrwRate) || usdKrwRate <= 0) return null
  const converted = amount * usdKrwRate
  return Number.isFinite(converted) ? converted : null
}
