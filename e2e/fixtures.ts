import { test as base, expect, type BrowserContext, type Page, type Route } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createPageErrorTracker } from './page-errors.js'

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
const fontBodies = new Map<string, Buffer>()

export const test = base.extend<{
  externalRouteContext: BrowserContext
  exchangeRateMock: ExchangeRateMock
  fontCdnRequests: string[]
  pageErrors: ReturnType<typeof createPageErrorTracker>
}>({
  externalRouteContext: async ({ context }, use) => {
    await use(context)
    // Remove interception once, after both fixtures finish. Removing the last handler
    // releases pending routes to fallback; wait for callbacks while the context is alive.
    await context.unrouteAll({ behavior: 'wait' })
  },
  pageErrors: [
    async ({ context }, use) => {
      const tracker = createPageErrorTracker()
      const observe = (page: Page) => page.on('pageerror', tracker.record)
      context.pages().forEach(observe)
      context.on('page', observe)
      await use(tracker)
      context.off('page', observe)
      context.pages().forEach((page) => page.off('pageerror', tracker.record))
      expect(tracker.unexpected, 'Unexpected browser page errors').toEqual([])
    },
    { auto: true },
  ],
  fontCdnRequests: [
    async ({ externalRouteContext: context }, use) => {
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
        // fulfill({ path }) awaits a disk read before sending its protocol command. During
        // teardown another completed route can release this request to fallback first.
        // Send the verified package bytes in the same turn; cache only requested assets.
        let body = fontBodies.get(file)
        if (body === undefined) {
          body = readFileSync(
            path.resolve(import.meta.dirname, '../node_modules/pretendard/dist/web/static', file),
          )
          fontBodies.set(file, body)
        }
        await route.fulfill({
          body,
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
    },
    { auto: true },
  ],
  exchangeRateMock: [
    async ({ externalRouteContext: context }, use) => {
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
    },
    { auto: true },
  ],
})
