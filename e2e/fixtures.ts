import { test as base, type Route } from '@playwright/test'
import path from 'node:path'

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

export const fontCdnBaseUrl = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/'

export const test = base.extend<{
  exchangeRateMock: ExchangeRateMock
  fontCdnRequests: string[]
}>({
  fontCdnRequests: [
    async ({ context }, use) => {
      const requests: string[] = []
      const pattern = 'https://cdn.jsdelivr.net/npm/pretendard@*/**'
      const handler = async (route: Route) => {
        const url = route.request().url()
        const file = url.slice(fontCdnBaseUrl.length)
        const allowedFile =
          /^(?:Pretendard-(?:Regular|Medium|SemiBold)\.css|woff2?-dynamic-subset\/Pretendard-(?:Regular|Medium|SemiBold)\.subset\.\d+\.woff2?)$/
        if (!url.startsWith(fontCdnBaseUrl) || !allowedFile.test(file)) {
          throw new Error(`Unexpected Pretendard CDN asset: ${url}`)
        }
        requests.push(url)
        // Use the identical pinned package bytes without contacting the CDN in CI.
        // Keep the CDN URL so relative font URLs and CORS are exercised by the browser.
        await route.fulfill({
          path: path.resolve(
            import.meta.dirname,
            '../node_modules/pretendard/dist/web/static',
            file,
          ),
          contentType: file.endsWith('.css')
            ? 'text/css'
            : file.endsWith('.woff2')
              ? 'font/woff2'
              : 'font/woff',
          headers: { 'access-control-allow-origin': '*' },
        })
      }
      await context.route(pattern, handler)
      await use(requests)
      await context.unroute(pattern, handler)
    },
    { auto: true },
  ],
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
