import { queryOptions, useQuery } from '@tanstack/react-query'
import { ApiError, createApiClient } from '@/shared/api'
import { exchangeRateSchema } from '../model/schema'

export const EXCHANGE_RATE_URL = 'https://api.frankfurter.dev/v2/rate/USD/KRW'
const requestExchangeRate = createApiClient('https://api.frankfurter.dev/v2')
export const exchangeRateKeys = {
  all: ['exchange-rates'] as const,
  usdKrw: () => [...exchangeRateKeys.all, 'frankfurter', 'v2', 'USD', 'KRW'] as const,
}
export const exchangeRateQueryOptions = () =>
  queryOptions({
    queryKey: exchangeRateKeys.usdKrw(),
    queryFn: ({ signal }) =>
      requestExchangeRate('/rate/USD/KRW', exchangeRateSchema, {
        signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
      }),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: (count, error) =>
      count < 1 &&
      !(
        error instanceof ApiError &&
        (error.code === 'INVALID_RESPONSE' ||
          (error.status !== null && error.status >= 400 && error.status < 500))
      ),
  })
export const useExchangeRate = () => useQuery(exchangeRateQueryOptions())
