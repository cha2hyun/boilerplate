import { expect, test, type Locator, type Page } from './fixtures.js'

const cardSelector = '#main-content [data-slot="card"][aria-busy]'
const initialTime = new Date('2026-11-04T00:00:00Z').getTime()

const pages = [
  { name: 'Overview', route: '/', endpoint: '/api/analytics', cards: 7 },
  { name: 'Analytics', route: '/analytics', endpoint: '/api/traffic?period=30', cards: 8 },
  { name: 'Orders', route: '/orders', endpoint: '/api/orders', cards: 5 },
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
}

async function captureColdCards(page: Page, expectedCount: number) {
  const snapshot = await page.waitForFunction(
    ({ selector, count }) => {
      const cards = [...document.querySelectorAll(selector)]
      if (
        cards.length !== count ||
        cards.some((card) => card.getAttribute('aria-busy') !== 'true')
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
