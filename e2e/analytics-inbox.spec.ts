import { expect, test, type Page } from './fixtures.js'

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
}

const launchMessageName = 'Open message from Maya Chen: Website launch checklist'

test('analytics period updates the metrics, charts, and traffic tables together', async ({
  page,
}) => {
  await page.goto('/analytics')
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
  await expect(page.getByText('Sample', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Daily visitors and sessions', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'Sessions by desktop, mobile, and tablet', exact: true }),
  ).toBeVisible()
  const visitors = page.locator(
    '[data-slot="card"][aria-label="Visitors"] [data-slot="card-title"]',
  )
  const sources = page.getByRole('table', { name: 'Traffic sources', exact: true })
  const topPages = page.getByRole('table', { name: 'Top pages', exact: true })
  await expect(visitors.locator('[data-number-state]')).toHaveAttribute('data-number-state', 'idle')
  const initialVisitors = await visitors.locator('.sr-only').innerText()
  const initialSource = await sources.getByRole('row').nth(1).innerText()
  const initialTopPage = await topPages.getByRole('row').nth(1).innerText()

  await page.getByRole('combobox', { name: 'Analytics period' }).click()
  await page.getByRole('option', { name: 'Last 7 days', exact: true }).click()
  await expect(page.locator('#main-content').getByRole('status')).toContainText(
    'Oct 28 – Nov 3, 2026',
  )
  await expect(visitors.locator('[data-number-state]')).toHaveAttribute('data-number-state', 'idle')
  await expect(visitors.locator('.sr-only')).not.toHaveText(initialVisitors)
  await expect(sources.getByRole('row').nth(1)).not.toHaveText(initialSource, {
    useInnerText: true,
  })
  await expect(topPages.getByRole('row').nth(1)).not.toHaveText(initialTopPage, {
    useInnerText: true,
  })
  await expect(page.getByText('Visitors and sessions over the selected 7 days.')).toBeVisible()
  await expect(page).toHaveURL((url) => url.searchParams.has('period'))
  const sevenDayUrl = page.url()
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Analytics period' })).toHaveText('Last 7 days')
  await expect(page.locator('#main-content').getByRole('status')).toContainText(
    'Oct 28 – Nov 3, 2026',
  )
  await page.goBack()
  await expect(page).toHaveURL('/analytics')
  await expect(page.getByRole('combobox', { name: 'Analytics period' })).toHaveText('Last 30 days')
  await page.goForward()
  await expect(page).toHaveURL(sevenDayUrl)
  await expect(page.getByRole('combobox', { name: 'Analytics period' })).toHaveText('Last 7 days')

  await page.getByRole('combobox', { name: 'Analytics period' }).click()
  await page.getByRole('option', { name: 'Last 30 days', exact: true }).click()
  await expect(page).toHaveURL('/analytics')
  await expect(visitors.locator('[data-number-state]')).toHaveAttribute('data-number-state', 'idle')
  await expect(visitors.locator('.sr-only')).toHaveText(initialVisitors)
  await expect(sources.getByRole('row').nth(1)).toHaveText(initialSource, { useInnerText: true })
  await expect(topPages.getByRole('row').nth(1)).toHaveText(initialTopPage, { useInnerText: true })
  await page.goto('/analytics?period=14')
  await expect(page.getByRole('combobox', { name: 'Analytics period' })).toHaveText('Last 14 days')
  await expect(page.getByText('Visitors and sessions over the selected 14 days.')).toBeVisible()
  await page.goto('/analytics?period=unsupported')
  await expect(page.getByRole('combobox', { name: 'Analytics period' })).toHaveText('Last 30 days')
  await expect(visitors.locator('[data-number-state]')).toHaveAttribute('data-number-state', 'idle')
  await expect(visitors.locator('.sr-only')).toHaveText(initialVisitors)
  await expectNoPageOverflow(page)
})

test('inbox combines unread and search filters and recovers from an empty result', async ({
  page,
}) => {
  await page.goto('/inbox')
  await page.getByRole('tab', { name: 'Unread', exact: true }).click()
  await expect(page.getByRole('button', { name: /Open message from/ })).toHaveCount(3)
  const search = page.getByRole('textbox', { name: 'Search messages', exact: true })
  await search.fill('planning workshop')
  await expect(page.getByRole('button', { name: /Open message from/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Open message from Sam Rivera/ })).toBeVisible()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('view') === 'unread' &&
      url.searchParams.get('q') === 'planning workshop',
  )
  const filteredUrl = page.url()
  await page.reload()
  await expect(search).toHaveValue('planning workshop')
  await expect(page.getByRole('tab', { name: 'Unread', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  )
  await expect(page.getByRole('button', { name: /Open message from/ })).toHaveCount(1)
  await page.goBack()
  await expect(page).toHaveURL('/inbox')
  await expect(search).toHaveValue('')
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  )
  await expect(page.getByRole('button', { name: /Open message from/ })).toHaveCount(5)
  await page.goForward()
  await expect(page).toHaveURL(filteredUrl)
  await expect(search).toHaveValue('planning workshop')
  await expect(page.getByRole('button', { name: /Open message from/ })).toHaveCount(1)
  await search.fill('no matching sample conversation')
  await expect(page.getByText('No messages found', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Show all messages', exact: true }).click()
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  )
  await expect(page.getByRole('button', { name: /Open message from/ })).toHaveCount(5)
  await expect(page).toHaveURL('/inbox')
  await page.goto('/inbox?view=unsupported&q=planning%20workshop')
  await expect(search).toHaveValue('planning workshop')
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  )
  await expect(page.getByRole('button', { name: /Open message from/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Open message from Sam Rivera/ })).toBeVisible()
  await expectNoPageOverflow(page)
})

test('inbox marks sample messages read and unread and restores an archived conversation', async ({
  page,
}) => {
  await page.goto('/inbox')
  await expect(page.getByText('3 unread', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: launchMessageName, exact: true }).click()
  await expect(page.getByText('2 unread', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mark unread', exact: true }).click()
  await expect(page.getByText('3 unread', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mark read', exact: true }).click()
  await expect(page.getByText('2 unread', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Archive', exact: true }).click()
  await expect(page.getByRole('button', { name: launchMessageName, exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Search messages' })).toBeFocused()
  await expect(page).toHaveURL('/inbox')

  await page.getByRole('tab', { name: 'Archived', exact: true }).click()
  await page.getByRole('button', { name: launchMessageName, exact: true }).click()
  await page.getByRole('button', { name: 'Move to inbox', exact: true }).click()
  await expect(page.getByRole('button', { name: launchMessageName, exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'All', exact: true }).click()
  await expect(page.getByRole('button', { name: launchMessageName, exact: true })).toBeVisible()
  await expect(page.locator('#main-content').getByRole('status')).toContainText('moved to inbox')
  await page.reload()
  await expect(page.getByText('3 unread', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: launchMessageName, exact: true })).toHaveAttribute(
    'aria-description',
    'Unread message',
  )
  await expectNoPageOverflow(page)
})

test('inbox supports keyboard message selection and responsive focus recovery', async ({
  page,
}) => {
  await page.goto('/inbox')
  const message = page.getByRole('button', { name: launchMessageName, exact: true })
  await message.focus()
  await page.keyboard.press('Enter')
  const subject = page.getByRole('heading', { name: 'Website launch checklist', exact: true })
  await expect(subject).toBeVisible()
  await expect(subject).toBeFocused()
  await expect(page.getByText('Thanks for all the thoughtful work on this release.')).toBeVisible()

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await expect(page.getByRole('region', { name: 'Message list', exact: true })).toBeHidden()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(message).toBeVisible()
    await expect(message).toBeFocused()
    await expect(subject).toHaveCount(0)
  } else {
    await expect(page.getByRole('region', { name: 'Message list', exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Open message from Alex Morgan/ }).click()
    await expect(
      page.getByRole('heading', { name: 'A few thoughts on the new dashboard', exact: true }),
    ).toBeFocused()
  }

  await page.goto('/inbox?view=unread')
  await page.getByRole('tab', { name: 'All', exact: true }).click()
  await page.getByRole('button', { name: /Open message from Jordan Lee/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Customer onboarding notes', exact: true }),
  ).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('tab', { name: 'Unread', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  )
  await expect(page.getByRole('region', { name: 'Message list', exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Customer onboarding notes', exact: true }),
  ).toHaveCount(0)
  await message.click()
  await expect(subject).toBeVisible()
  await expect(message).toHaveCount(0)
  await expect(page.getByText('2 unread', { exact: true })).toBeVisible()
  await expectNoPageOverflow(page)
})

async function prepareLargeText(
  page: Page,
  route: '/analytics' | '/inbox',
  width: number,
  locale: 'en-US' | 'ko-KR',
) {
  await page.setViewportSize({ width, height: 915 })
  await page.goto(route)
  await page.getByRole('button', { name: /^(Language|언어 선택)$/ }).click()
  await page.getByRole('menuitemradio', { name: locale === 'en-US' ? 'English' : '한국어' }).click()
  await page.addStyleTag({ content: ':root { font-size: 200%; }' })
  await page.evaluate(() => document.fonts.ready)
}

const largeTextCases = [
  { width: 412, locale: 'en-US' },
  { width: 320, locale: 'ko-KR' },
] as const

test('keeps device labels, values, and tooltips readable at 200% text on narrow mobile screens', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This check covers narrow mobile text scaling.')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const { width, locale } of largeTextCases) {
    await prepareLargeText(page, '/analytics', width, locale)
    const chart = page.locator('[data-slot="chart"]').nth(1)
    const ticks = chart.locator('.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value')
    await expect(ticks).toHaveCount(3)
    await expect
      .poll(() =>
        chart.evaluate((element) => {
          const bounds = element.getBoundingClientRect()
          return [
            ...element.querySelectorAll(
              '.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value',
            ),
          ].every((tick) => {
            const box = tick.getBoundingClientRect()
            return box.left >= bounds.left - 1 && box.right <= bounds.right + 1
          })
        }),
      )
      .toBe(true)
    const summary = page.locator('#main-content dl')
    const rowBounds = await summary.locator(':scope > *').evaluateAll((rows) =>
      rows.map((row) => {
        const bounds = row.getBoundingClientRect()
        const cells = [...row.querySelectorAll('dt,dd')]
        return {
          top: bounds.top,
          bottom: bounds.bottom,
          contained: cells.every((cell) => {
            const box = cell.getBoundingClientRect()
            return (
              box.left >= bounds.left - 1 &&
              box.right <= bounds.right + 1 &&
              cell.scrollWidth <= cell.clientWidth + 1
            )
          }),
        }
      }),
    )
    expect(rowBounds).toHaveLength(3)
    for (let index = 0; index < rowBounds.length; index += 1) {
      expect(rowBounds[index]!.contained).toBe(true)
      if (index > 0) expect(rowBounds[index - 1]!.bottom).toBeLessThanOrEqual(rowBounds[index]!.top)
    }
    await chart.scrollIntoViewIfNeeded()
    await chart.getByRole('application').focus()
    await page.keyboard.press('ArrowRight')
    const tooltip = chart.locator('[data-slot="chart-tooltip-content"]')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('21,069')
    await expect(tooltip).toBeInViewport({ ratio: 1 })
    const tooltipBounds = await tooltip.boundingBox()
    const chartBounds = await chart.boundingBox()
    if (!tooltipBounds || !chartBounds) throw new Error('The chart tooltip is missing.')
    expect(tooltipBounds.x).toBeGreaterThanOrEqual(chartBounds.x - 1)
    expect(tooltipBounds.x + tooltipBounds.width).toBeLessThanOrEqual(
      chartBounds.x + chartBounds.width + 1,
    )
    expect(
      await tooltip.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true)
    const value = tooltip.locator('[data-slot="chart-tooltip-value"]')
    await expect(value).toHaveText('21,069')
    expect(
      await value.evaluate((element) => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return range.getClientRects().length
      }),
    ).toBe(1)
  }
})

test('keeps inbox navigation and detail actions inside the card at 200% text', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This check covers narrow mobile text scaling.')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const { width, locale } of largeTextCases) {
    await prepareLargeText(page, '/inbox', width, locale)
    const card = page.locator('#main-content [data-slot="card"]')
    const cardBounds = await card.boundingBox()
    if (!cardBounds) throw new Error('The inbox card is missing.')
    const unread = page.getByText(locale === 'en-US' ? '3 unread' : '읽지 않음 3개', {
      exact: true,
    })
    const badgeBounds = await unread.boundingBox()
    if (!badgeBounds) throw new Error('The unread count is missing.')
    expect(badgeBounds.x).toBeGreaterThanOrEqual(cardBounds.x)
    expect(badgeBounds.x + badgeBounds.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width)
    for (const tab of await card.getByRole('tab').all()) {
      await tab.scrollIntoViewIfNeeded()
      const bounds = await tab.boundingBox()
      if (!bounds) throw new Error('The message view tab is missing.')
      expect(bounds.x).toBeGreaterThanOrEqual(cardBounds.x)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width)
      await tab.tap()
    }
    await card.getByRole('tab', { name: locale === 'en-US' ? 'All' : '전체', exact: true }).tap()
    const message = page.getByRole('button', { name: /Maya Chen/ }).first()
    await message.tap()
    const subject = page.getByRole('heading', { name: 'Website launch checklist', exact: true })
    await expect(subject).toBeFocused()
    const article = card.getByRole('article')
    for (const button of await article.getByRole('button').all()) {
      await button.scrollIntoViewIfNeeded()
      const bounds = await button.boundingBox()
      if (!bounds) throw new Error('The message action is missing.')
      expect(bounds.x).toBeGreaterThanOrEqual(cardBounds.x)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width)
      expect(
        await button.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true)
    }
    const sender = article.getByText('Maya Chen', { exact: true })
    expect(
      await sender.evaluate(
        (element) =>
          element.getBoundingClientRect().height <=
          Number.parseFloat(getComputedStyle(element).lineHeight) * 2,
      ),
    ).toBe(true)
    await article
      .getByRole('button', { name: locale === 'en-US' ? 'Back' : '뒤로', exact: true })
      .tap()
    await expect(message).toBeFocused()
    await message.tap()
    await article
      .getByRole('button', { name: locale === 'en-US' ? 'Archive' : '보관', exact: true })
      .tap()
    await expect(
      page.getByRole('textbox', {
        name: locale === 'en-US' ? 'Search messages' : '메시지 검색',
        exact: true,
      }),
    ).toBeFocused()
    await expectNoPageOverflow(page)
  }
})
