import { expect, test, type Locator, type Page } from './fixtures.js'
import { storageKeys } from '../src/shared/config/product.js'

const cardSelector = '#main-content [data-slot="card"][aria-busy]'
const initialTime = new Date('2026-11-04T00:00:00Z').getTime()

const pages = [
  { name: 'Overview', route: '/', endpoint: '/api/analytics', cards: 7 },
  { name: 'Analytics', route: '/analytics', endpoint: '/api/traffic?period=30', cards: 8 },
  {
    name: 'Orders',
    route: '/orders',
    endpoint: '/api/orders?q=&status=all&sort=newest&page=1&pageSize=6',
    cards: 5,
  },
  { name: 'Customers', route: '/customers', endpoint: '/api/customers', cards: 5 },
] as const

function requestPath(url: string) {
  const parsed = new URL(url)
  return `${parsed.pathname}${parsed.search}`
}

async function navigate(page: Page, name: string, route: string) {
  if ((page.viewportSize()?.width ?? 1440) < 768) {
    await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click()
  }
  await page.getByRole('link', { name, exact: true }).click()
  await expect(page).toHaveURL(route)
  if ((page.viewportSize()?.width ?? 1440) < 768 && ['Orders', 'Customers'].includes(name)) {
    await page.getByRole('button', { name: 'Show summary', exact: true }).click()
  }
}

const analyticsPages = [
  {
    name: 'Overview',
    route: '/',
    endpoint: '/api/analytics',
    cards: 7,
    error: "Analytics couldn't load",
    refreshError: "Analytics couldn't load",
    retry: 'Try again',
    empty: { kpis: [], revenue: [], activity: [] },
    emptyLabels: ['No revenue data for this period.', 'No recent activity'],
    unavailable: 'Activity unavailable',
  },
  {
    name: 'Analytics',
    route: '/analytics',
    endpoint: '/api/traffic',
    cards: 8,
    error: "Analytics couldn't load",
    refreshError: "Analytics couldn't refresh",
    retry: 'Try again',
    empty: {
      days: [],
      visitors: 0,
      sessions: 0,
      pageViews: 0,
      bounceRate: 0,
      sources: [],
      pages: [],
      devices: [],
    },
    emptyLabels: [
      'No audience data',
      'No device data',
      'No traffic sources yet',
      'No top pages yet',
    ],
    unavailable: 'Audience data unavailable',
  },
] as const

type ReadMode = 'normal' | 'failure' | 'empty'

async function controlAnalyticsReads(
  page: Page,
  sample: (typeof analyticsPages)[number],
  mode: ReadMode,
) {
  // The service worker and real adapters stay active. Intercept only the browser's fetch boundary
  // for the failure/empty response, then restore the actual HTTP path for recovery.
  if (sample.name === 'Overview' && mode === 'empty') {
    // Projects uses a browser-local adapter in demo mode, independently of the analytics HTTP API.
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, projects: [] }))
    }, storageKeys.demoProjects)
  }
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  return page.evaluateHandle(
    ({ endpoint, empty, mode }) => {
      const originalFetch = window.fetch.bind(window)
      const state = { mode, failures: 0, emptyResponses: 0 }
      window.fetch = (input, init) => {
        const url = input instanceof Request ? input.url : String(input)
        const pathname = new URL(url, location.origin).pathname
        if (pathname === endpoint && state.mode !== 'normal') {
          if (state.mode === 'failure') {
            state.failures += 1
            // A 400 is deliberately not automatically retried by the real Query policy.
            return Promise.resolve(Response.json({ message: 'Read unavailable' }, { status: 400 }))
          }
          state.emptyResponses += 1
          return Promise.resolve(Response.json(empty))
        }
        return originalFetch(input, init)
      }
      return {
        setMode: (next: ReadMode) => {
          state.mode = next
        },
        counts: () => ({ failures: state.failures, emptyResponses: state.emptyResponses }),
        restore: () => {
          window.fetch = originalFetch
        },
      }
    },
    { endpoint: sample.endpoint, empty: sample.empty, mode },
  )
}

for (const sample of analyticsPages) {
  test(`${sample.name} recovers a cold read error and preserves cached content after a refresh failure`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(initialTime)
    const control = await controlAnalyticsReads(page, sample, 'failure')
    try {
      await navigate(page, sample.name, sample.route)
      const loadError = page.getByRole('alert').filter({ hasText: sample.error })
      await expect(loadError).toBeVisible()
      await expect(page.getByText(sample.unavailable, { exact: true })).toBeVisible()
      const metrics = page.locator('[data-metric-card] [data-slot="metric-value"]')
      await expect(metrics).toHaveText(['—', '—', '—', '—'])
      await expectReadyCards(page.locator(cardSelector), sample.cards)
      expect(await control.evaluate((state) => state.counts())).toEqual({
        failures: 1,
        emptyResponses: 0,
      })

      await control.evaluate((state) => {
        state.setMode('normal')
      })
      await loadError.getByRole('button', { name: sample.retry, exact: true }).click()
      await expect(loadError).toBeHidden()
      const cards = page.locator(cardSelector)
      await expectReadyCards(cards, sample.cards)
      const savedNumbers = await cards.locator('[data-number-state] > .sr-only').allTextContents()
      expect(savedNumbers.length).toBeGreaterThanOrEqual(4)
      await expect(page.getByText(sample.unavailable, { exact: true })).toHaveCount(0)

      await navigate(page, 'Settings', '/settings')
      await page.clock.setFixedTime(initialTime + 61_000)
      await control.evaluate((state) => {
        state.setMode('failure')
      })
      const loading = await watchForLoadingFallback(page)
      await navigate(page, sample.name, sample.route)
      const refreshError = page.getByRole('alert').filter({ hasText: sample.refreshError })
      await expect(refreshError).toBeVisible()
      await expectReadyCards(cards, sample.cards)
      expect(await cards.locator('[data-number-state] > .sr-only').allTextContents()).toEqual(
        savedNumbers,
      )
      await expect(page.getByText(sample.unavailable, { exact: true })).toHaveCount(0)
      for (const label of sample.emptyLabels)
        await expect(page.getByText(label, { exact: true })).toHaveCount(0)
      expect(await loading.evaluate((observer) => observer.finish())).toBe(false)
      await loading.dispose()
      expect(await control.evaluate((state) => state.counts())).toEqual({
        failures: 2,
        emptyResponses: 0,
      })

      await control.evaluate((state) => {
        state.setMode('normal')
      })
      await refreshError.getByRole('button', { name: sample.retry, exact: true }).click()
      await expect(refreshError).toBeHidden()
      await expectReadyCards(cards, sample.cards)
      expect(await cards.locator('[data-number-state] > .sr-only').allTextContents()).toEqual(
        savedNumbers,
      )
    } finally {
      await control.evaluate((state) => {
        state.restore()
      })
      await control.dispose()
    }
  })

  test(`${sample.name} distinguishes a successful empty response from loading and errors`, async ({
    page,
  }) => {
    const control = await controlAnalyticsReads(page, sample, 'empty')
    try {
      await navigate(page, sample.name, sample.route)
      await expectReadyCards(page.locator(cardSelector), sample.cards)
      await expect(page.getByRole('alert')).toHaveCount(0)
      await expect(page.getByText(sample.unavailable, { exact: true })).toHaveCount(0)
      for (const label of sample.emptyLabels)
        await expect(page.getByText(label, { exact: true })).toBeVisible()
      if (sample.name === 'Overview') {
        await expect(page.locator('[data-metric-card] [data-slot="metric-value"]')).toHaveText([
          '—',
          '—',
          '—',
          '—',
        ])
        await expect(
          page.getByText('A fresh start for your next idea', { exact: true }),
        ).toBeVisible()
      } else {
        const numbers = await page
          .locator('[data-metric-card] [data-number-state] > .sr-only')
          .allTextContents()
        expect(numbers).toHaveLength(4)
        for (const number of numbers) expect(number).toMatch(/^0(?:\.0)?%?$/)
      }
      expect(await control.evaluate((state) => state.counts())).toEqual({
        failures: 0,
        emptyResponses: 1,
      })
    } finally {
      await control.evaluate((state) => {
        state.restore()
      })
      await control.dispose()
    }
  })
}

async function captureColdCards(page: Page, expectedCount: number) {
  const snapshot = await page.waitForFunction(
    ({ selector, count }) => {
      const cards = [...document.querySelectorAll(selector)]
      if (
        cards.length !== count ||
        cards.some((card) => {
          const bounds = card.getBoundingClientRect()
          // Mobile summaries remain mounted while collapsed. Measure the displayed loading
          // layout only, after the same user action that exposes the ready-state cards.
          return (
            card.getAttribute('aria-busy') !== 'true' ||
            !card.checkVisibility() ||
            bounds.width <= 0 ||
            bounds.height <= 0
          )
        })
      ) {
        return null
      }
      return cards.map((card) => {
        const rect = card.getBoundingClientRect()
        const comparison = card.querySelector('[data-testid="kpi-comparison"]')
        const indicator = comparison
          ?.querySelector('[data-slot="skeleton"]')
          ?.getBoundingClientRect()
        const description = comparison?.lastElementChild?.getBoundingClientRect()
        return {
          name:
            card.getAttribute('aria-label') ??
            card.querySelector('[data-slot="card-title"]')?.textContent ??
            '',
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height,
          skeletons: card.querySelectorAll('[data-slot="skeleton"]').length,
          comparisonCenterDelta:
            indicator && description
              ? Math.abs(
                  indicator.y + indicator.height / 2 - description.y - description.height / 2,
                )
              : null,
        }
      })
    },
    { selector: cardSelector, count: expectedCount },
  )
  const cards = await snapshot.jsonValue()
  await snapshot.dispose()
  if (!cards) throw new Error('No cold-loading card layout was captured.')
  expect(cards.every((card) => card.skeletons > 0)).toBe(true)
  return cards
}

async function expectOverviewComparisonsCentered(page: Page) {
  const comparisons = page.getByTestId('kpi-comparison')
  await expect(comparisons).toHaveCount(4)
  const centers = await comparisons.evaluateAll((rows) =>
    rows.map((row) => {
      const badge = row.querySelector('[data-slot="badge"]')?.getBoundingClientRect()
      const description = row.lastElementChild?.getBoundingClientRect()
      if (!badge || !description) throw new Error('KPI badge or comparison text is missing')
      return Math.abs(badge.y + badge.height / 2 - description.y - description.height / 2)
    }),
  )
  for (const delta of centers) expect(delta).toBeLessThanOrEqual(1)
}

async function captureCards(cards: Locator) {
  return cards.evaluateAll((elements) =>
    elements.map((card) => {
      const rect = card.getBoundingClientRect()
      return {
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
      }
    }),
  )
}

async function watchForLoadingFallback(page: Page) {
  // Keep the observer in a test-owned handle; the application exposes no test globals.
  return page.evaluateHandle((selector) => {
    let appeared = false
    const inspect = () => {
      appeared ||= [...document.querySelectorAll(selector)].some(
        (card) =>
          card.getAttribute('aria-busy') === 'true' ||
          card.querySelector('[data-slot="skeleton"]') !== null,
      )
    }
    const observer = new MutationObserver(inspect)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy'],
    })
    return {
      finish: () => {
        inspect()
        observer.disconnect()
        return appeared
      },
    }
  }, cardSelector)
}

async function expectReadyCards(cards: Locator, count: number) {
  await expect(cards).toHaveCount(count)
  await expect(cards.locator('[data-slot="skeleton"]')).toHaveCount(0)
  await expect(cards.locator('[data-number-state="running"]')).toHaveCount(0)
  expect(
    await cards.evaluateAll((elements) => elements.map((card) => card.getAttribute('aria-busy'))),
  ).toEqual(Array<string>(count).fill('false'))
}

for (const sample of pages) {
  test(`${sample.name} keeps card geometry and cached data through real demo requests`, async ({
    page,
  }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      const path = requestPath(request.url())
      if (path.startsWith('/api/')) requests.push(path)
    })
    const requestCount = (path: string) => requests.filter((request) => request === path).length

    // Freeze only wall-clock dates: the worker delay, animation frames, and UI timers stay real.
    await page.clock.setFixedTime(initialTime)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    // The closed currency menu keeps the header stable independently of the FX response.
    await page.evaluate(async () => {
      await Promise.all(
        ['400', '500', '600'].map((weight) =>
          document.fonts.load(`${weight} 16px Pretendard`, 'Blueprint 0123456789%$ –·'),
        ),
      )
      await document.fonts.ready
    })

    const cold = captureColdCards(page, sample.cards)
    const firstResponse = page.waitForResponse(
      (response) => requestPath(response.url()) === sample.endpoint,
    )
    await navigate(page, sample.name, sample.route)
    const before = await cold
    if (sample.name === 'Overview') {
      const comparisons = before.filter((card) => card.comparisonCenterDelta !== null)
      expect(comparisons).toHaveLength(4)
      for (const card of comparisons) expect(card.comparisonCenterDelta).toBeLessThanOrEqual(1)
    }
    expect((await firstResponse).fromServiceWorker()).toBe(true)
    const cards = page.locator(cardSelector)
    await expectReadyCards(cards, sample.cards)
    const after = await captureCards(cards)
    const metricHeight = (page.viewportSize()?.width ?? 1440) < 768 ? 136 : 192
    const metricHeights = await page
      .locator('[data-metric-card]')
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height))
    for (const height of metricHeights) expect(height).toBe(metricHeight)
    if (sample.name === 'Overview') await expectOverviewComparisonsCentered(page)
    expect(after).toHaveLength(before.length)
    before.forEach((loading, index) => {
      const ready = after[index]
      if (!ready) throw new Error(`Missing ready card: ${loading.name}`)
      for (const dimension of ['x', 'y', 'width', 'height'] as const) {
        expect(
          Math.abs(ready[dimension] - loading[dimension]),
          `${sample.name}: ${loading.name} changed ${dimension} between loading and ready`,
        ).toBeLessThanOrEqual(0.5)
      }
    })
    expect(requestCount(sample.endpoint)).toBe(1)
    const initialNumbers = await cards.locator('[data-number-state] > .sr-only').allTextContents()
    expect(initialNumbers.length).toBeGreaterThan(0)

    if (sample.name === 'Overview') {
      const revenue = page.getByLabel('Revenue overview', { exact: true })
      const total = revenue.locator('[data-number-state] > .sr-only').first()
      const monthlyRevenue = await total.innerText()
      const periodLoading = await watchForLoadingFallback(page)
      await page.getByRole('combobox', { name: 'Revenue period' }).click()
      await page.getByRole('option', { name: 'Last 7 days', exact: true }).click()
      await expect(page).toHaveURL(
        (url) => JSON.parse(url.searchParams.get('period') ?? 'null') === '7',
      )
      await expectReadyCards(cards, sample.cards)
      await expect(total).not.toHaveText(monthlyRevenue)
      expect(requestCount(sample.endpoint)).toBe(1)

      await page.goBack()
      await expect(page).toHaveURL('/')
      await expectReadyCards(cards, sample.cards)
      await expect(total).toHaveText(monthlyRevenue)
      expect(await periodLoading.evaluate((observer) => observer.finish())).toBe(false)
      await periodLoading.dispose()
      expect(requestCount(sample.endpoint)).toBe(1)
    }

    if (sample.name === 'Analytics') {
      const visitors = page.locator(
        '[data-slot="card"][aria-label="Visitors"] [data-number-state] > .sr-only',
      )
      const monthlyVisitors = await visitors.innerText()
      const weeklyResponse = page.waitForResponse(
        (response) => requestPath(response.url()) === '/api/traffic?period=7',
      )
      await page.getByRole('combobox', { name: 'Analytics period' }).click()
      await page.getByRole('option', { name: 'Last 7 days', exact: true }).click()
      await expect(cards.first()).toHaveAttribute('aria-busy', 'true')
      await weeklyResponse
      await expectReadyCards(cards, sample.cards)
      await expect(visitors).not.toHaveText(monthlyVisitors)
      expect(requestCount('/api/traffic?period=7')).toBe(1)

      await page.getByRole('combobox', { name: 'Analytics period' }).click()
      await page.getByRole('option', { name: 'Last 30 days', exact: true }).click()
      await expectReadyCards(cards, sample.cards)
      await expect(visitors).toHaveText(monthlyVisitors)
      expect(requestCount('/api/traffic?period=30')).toBe(1)
      expect(requestCount('/api/traffic?period=7')).toBe(1)
    }

    await navigate(page, 'Settings', '/settings')
    const warmLoading = await watchForLoadingFallback(page)
    await navigate(page, sample.name, sample.route)
    await expectReadyCards(cards, sample.cards)
    expect(await warmLoading.evaluate((observer) => observer.finish())).toBe(false)
    if (sample.name === 'Overview') await expectOverviewComparisonsCentered(page)
    await warmLoading.dispose()
    expect(await cards.locator('[data-number-state] > .sr-only').allTextContents()).toEqual(
      initialNumbers,
    )
    expect(requestCount(sample.endpoint)).toBe(1)

    await navigate(page, 'Settings', '/settings')
    await page.clock.setFixedTime(initialTime + 61_000)
    const backgroundLoading = await watchForLoadingFallback(page)
    const refreshRequest = page.waitForRequest(
      (request) => requestPath(request.url()) === sample.endpoint,
    )
    const refreshResponse = page.waitForResponse(
      (response) => requestPath(response.url()) === sample.endpoint,
    )
    await navigate(page, sample.name, sample.route)
    await refreshRequest
    // A stale revisit keeps the previous payload mounted during the in-flight request.
    expect(await cards.locator('[data-slot="skeleton"]').count()).toBe(0)
    expect(
      await cards.evaluateAll((elements) => elements.map((card) => card.getAttribute('aria-busy'))),
    ).toEqual(Array<string>(sample.cards).fill('false'))
    expect(await cards.locator('[data-number-state] > .sr-only').allTextContents()).toEqual(
      initialNumbers,
    )
    expect((await refreshResponse).fromServiceWorker()).toBe(true)
    await expectReadyCards(cards, sample.cards)
    expect(await backgroundLoading.evaluate((observer) => observer.finish())).toBe(false)
    await backgroundLoading.dispose()
    expect(requestCount(sample.endpoint)).toBe(2)
  })
}
