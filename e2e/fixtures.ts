import { test as base, type Route } from '@playwright/test'

export { expect } from '@playwright/test'
export type { Locator, Page } from '@playwright/test'

export const exchangeRateUrl = 'https://api.frankfurter.dev/v2/rate/USD/KRW'
export const exchangeRateResponse = {
  date: '2026-11-03',
  base: 'USD',
  quote: 'KRW',
  rate: 1350,
} as const

interface ExchangeRateMock {
  requests: number
}

export const test = base.extend<{ exchangeRateMock: ExchangeRateMock }>({
  exchangeRateMock: [
    async ({ context }, use) => {
      const traffic = { requests: 0 }
      const handler = async (route: Route) => {
        traffic.requests += 1
        await route.fulfill({
          status: 200,
          json: exchangeRateResponse,
          headers: { 'access-control-allow-origin': '*' },
        })
      }
      // Context routing also catches the network request forwarded by the demo service worker.
      // Keep every application /api request on its real demo adapter and query-cache path.
      await context.route(exchangeRateUrl, handler)
      await use(traffic)
      await context.unroute(exchangeRateUrl, handler)
    },
    { auto: true },
  ],
})
