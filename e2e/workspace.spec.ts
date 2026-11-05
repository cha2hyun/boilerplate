import { expect, fontCdnBaseUrl, test, type Page } from './fixtures.js'
import { pageMetadata } from '../src/app/seo/metadata.ts'

test('serves page metadata without JavaScript and updates it during client navigation', async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The HTML head is independent of viewport size.')
  for (const [route, metadata] of Object.entries(pageMetadata)) {
    const response = await request.get(route)
    expect(response.ok()).toBe(true)
    const html = await response.text()
    expect(html).toContain(`<title data-page-meta>${metadata.title} · Blueprint</title>`)
    expect(html).toContain(`property="og:title" content="${metadata.title} · Blueprint"`)
  }
  await page.goto('/projects')
  await expect(page).toHaveTitle('Projects · Blueprint')
  await page.getByRole('link', { name: 'Orders', exact: true }).click()
  await expect(page).toHaveTitle('Orders · Blueprint')
  await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Orders · Blueprint',
  )
  await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1)
})

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
}

function overviewPanelGeometry({
  revenue,
  activity,
  loading,
}: {
  revenue: string
  activity: string
  loading: boolean
}) {
  const cards = [...document.querySelectorAll('[data-slot="card"]')]
  const chart = cards.find((card) => card.getAttribute('aria-label') === revenue)
  const activityCard = [...document.querySelectorAll('[role="region"]')]
    .find((region) => region.getAttribute('aria-label') === activity)
    ?.closest('[data-slot="card"]')
  if (
    !chart ||
    !activityCard ||
    [chart, activityCard].some((card) => card.getAttribute('aria-busy') !== String(loading))
  ) {
    return null
  }
  return [chart, activityCard].map((card) => {
    const footer = card.querySelector('[data-slot="card-footer"]')
    const content = footer?.firstElementChild
    if (!footer || !content) throw new Error('An overview panel footer is missing.')
    const cardBox = card.getBoundingClientRect()
    const footerBox = footer.getBoundingClientRect()
    const contentBox = content.getBoundingClientRect()
    const separator = Number.parseFloat(getComputedStyle(footer).borderTopWidth)
    // Include the card's bottom padding: the visible footer band ends at its outer border.
    const bandTop = footerBox.top + separator
    const bandBottom = cardBox.bottom - Number.parseFloat(getComputedStyle(card).borderBottomWidth)
    return {
      top: cardBox.top + window.scrollY,
      bottom: cardBox.bottom + window.scrollY,
      divider: footerBox.top + window.scrollY,
      separator,
      footerHeight: bandBottom - bandTop,
      contentCenter: contentBox.top + contentBox.height / 2 + window.scrollY,
      centerDelta: Math.abs(contentBox.top + contentBox.height / 2 - (bandTop + bandBottom) / 2),
      topSpace: contentBox.top - bandTop,
      bottomSpace: bandBottom - contentBox.bottom,
      contentHeight: contentBox.height,
      lineHeight: Number.parseFloat(getComputedStyle(content).lineHeight),
      horizontalOverflow: content.scrollWidth - content.clientWidth,
      verticalOverflow: content.scrollHeight - content.clientHeight,
    }
  })
}

function expectOverviewPanelFooters(
  panels: ReturnType<typeof overviewPanelGeometry>,
  sideBySide: boolean,
) {
  if (!panels || panels.length !== 2) throw new Error('The overview panels are incomplete.')
  for (const panel of panels) {
    expect(panel.separator).toBeGreaterThan(0)
    expect(panel.centerDelta).toBeLessThanOrEqual(1)
    expect(panel.topSpace).toBeGreaterThanOrEqual(15)
    expect(panel.bottomSpace).toBeGreaterThanOrEqual(15)
    expect(panel.horizontalOverflow).toBeLessThanOrEqual(1)
    expect(panel.verticalOverflow).toBeLessThanOrEqual(1)
  }
  const [chart, activity] = panels
  if (!chart || !activity) throw new Error('The overview panels are incomplete.')
  if (sideBySide) {
    for (const edge of ['top', 'bottom', 'divider', 'contentCenter'] as const) {
      expect(
        Math.abs(chart[edge] - activity[edge]),
        `Overview panel ${edge} alignment`,
      ).toBeLessThanOrEqual(1)
    }
  } else {
    expect(activity.top - chart.bottom).toBeGreaterThanOrEqual(19)
  }
}

test('switches shared number formats and keeps compact motion text within its reserved width', async ({
  page,
}) => {
  await page.goto('/foundations')
  await page.getByRole('tab', { name: 'Feedback', exact: true }).click()
  const number = page.locator('[data-number-state]')
  const finalValue = number.locator('.sr-only')
  await expect(finalValue).toHaveText('100,400')
  await expect(page.getByRole('switch', { name: 'Currency symbol', exact: true })).toBeDisabled()
  await page.getByRole('switch', { name: 'Thousands grouping', exact: true }).click()
  await expect(finalValue).toHaveText('100400')
  await page.getByRole('combobox', { name: 'Number format', exact: true }).click()
  await page.getByRole('option', { name: 'US dollar · USD', exact: true }).click()
  await expect(finalValue).toHaveText('$100400.00')
  await page.getByRole('switch', { name: 'Currency symbol', exact: true }).click()
  await expect(finalValue).toHaveText('100400.00')
  await page.getByRole('switch', { name: 'Compact notation', exact: true }).click()
  await expect(finalValue).toHaveText('100.4K')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('switch', { name: 'Number animation', exact: true }).click()
  await expect(number).toHaveAttribute('data-number-state', 'idle')

  // Begin measurement in the same browser task as the click, before the first animated frame.
  const measurements = await page.evaluate(async () => {
    await document.fonts.ready
    const changeValue = [...document.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === 'Change value',
    )
    if (!changeValue) throw new Error('The number demo change button is missing.')
    changeValue.click()
    const widths: number[] = []
    const clipped: string[] = []
    let sawIntermediate = false
    const start = performance.now()
    await new Promise<void>((resolve, reject) => {
      const measure = () => {
        const element = document.querySelector<HTMLElement>('[data-number-state]')
        const visual = element?.querySelector<HTMLElement>('.absolute[aria-hidden="true"]')
        if (!element || !visual) {
          reject(new Error('The number demo is missing.'))
          return
        }
        widths.push(element.getBoundingClientRect().width)
        if (visual.scrollWidth > visual.clientWidth + 1) clipped.push(visual.textContent)
        if (element.dataset.numberState === 'running') sawIntermediate = true
        if (performance.now() - start < 400) requestAnimationFrame(measure)
        else resolve()
      }
      requestAnimationFrame(measure)
    })
    return { widths, clipped, sawIntermediate }
  })
  expect(measurements.sawIntermediate).toBe(true)
  expect(measurements.clipped).toEqual([])
  expect(Math.max(...measurements.widths) - Math.min(...measurements.widths)).toBeLessThanOrEqual(
    0.5,
  )
  await expect(finalValue).toHaveText('1M')
  await page.getByRole('switch', { name: 'Number animation', exact: true }).click()
  await page.getByRole('button', { name: 'Change value', exact: true }).click()
  await expect(finalValue).toHaveText('100.4K')
  await expect(number).toHaveAttribute('data-number-state', 'idle')
  await expectNoPageOverflow(page)
})

test('loads the overview without browser errors and changes the revenue period', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Overview', level: 1, exact: true })).toBeVisible()
  await expect(page.getByText('WORKSPACE OVERVIEW', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Active customers', { exact: true })).toBeVisible()
  await expect(page.getByText('Demo workspace', { exact: true })).toHaveCount(0)
  const footer = page.locator('main > footer')
  await expect(footer.getByText('Made by cha2hyun', { exact: true })).toBeVisible()
  const repository = footer.getByRole('link', { name: 'GitHub', exact: true })
  await expect(repository).toHaveAttribute('href', 'https://github.com/cha2hyun/boilerplate')
  await expect(repository).toHaveAttribute('target', '_blank')
  await expect(repository).toHaveAttribute('rel', /noopener/)
  await expect(repository).toHaveAttribute('rel', /noreferrer/)
  await expect(repository).toHaveAccessibleDescription('Opens in a new tab')
  const footerAlignment = await footer.evaluate((element) => {
    const author = element.firstElementChild
    const link = element.querySelector('a')
    if (!author || !link) throw new Error('Footer content is missing')
    const authorBox = author.getBoundingClientRect()
    const linkBox = link.getBoundingClientRect()
    return {
      authorRight: authorBox.right,
      linkLeft: linkBox.left,
      centerDelta: Math.abs(
        authorBox.top + authorBox.height / 2 - linkBox.top - linkBox.height / 2,
      ),
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }
  })
  expect(footerAlignment.authorRight).toBeLessThan(footerAlignment.linkLeft)
  expect(footerAlignment.centerDelta).toBeLessThanOrEqual(1)
  expect(footerAlignment.scrollWidth).toBeLessThanOrEqual(footerAlignment.width)
  await expect(
    page.getByRole('application', { name: 'Revenue compared with previous period', exact: true }),
  ).toBeVisible()
  const customerMetric = page.locator('[data-slot="card"][aria-label="Active customers"]')
  await expect(customerMetric.locator('[data-number-state] .sr-only')).toHaveText('2,420')
  await expect(customerMetric.locator('[data-number-state]')).toHaveAttribute(
    'data-number-state',
    'idle',
  )
  await expect(page.getByRole('button', { name: 'Website redesign', exact: true })).toBeVisible()
  await expect(page.getByText('Oct 5 – Nov 3 · Revenue in USD', { exact: true })).toBeVisible()

  const chart = page.locator('[data-slot="card"]').filter({
    has: page.getByText('Revenue overview', { exact: true }),
  })
  const unusedBottomSpace = await chart.evaluate((element) => {
    const footer = element.querySelector('[data-slot="card-footer"]')
    if (!footer) throw new Error('The revenue chart footer is missing.')
    return element.getBoundingClientRect().bottom - footer.getBoundingClientRect().bottom
  })
  expect(unusedBottomSpace).toBeLessThanOrEqual(32)
  const activity = page.getByRole('region', { name: 'Recent activity', exact: true })
  await expect(activity).toBeVisible()
  // Recharts measures its parent asynchronously; check the rendered plot, not CSS classes.
  await expect(async () => {
    const geometry = await chart.evaluate((element) => {
      const activityCard = element.parentElement
        ?.querySelector('[role="region"]')
        ?.closest('[data-slot="card"]')
      const plot = element.querySelector('[data-slot="chart"]')
      const svg = plot?.querySelector('svg.recharts-surface')
      const footer = element.querySelector('[data-slot="card-footer"]')
      if (!activityCard || !plot?.parentElement || !svg || !footer) {
        throw new Error('The overview panel layout is incomplete.')
      }
      const cardBox = element.getBoundingClientRect()
      const activityBox = activityCard.getBoundingClientRect()
      const plotBox = plot.getBoundingClientRect()
      return {
        topDelta: Math.abs(cardBox.top - activityBox.top),
        bottomDelta: Math.abs(cardBox.bottom - activityBox.bottom),
        stackedGap: activityBox.top - cardBox.bottom,
        plotHeight: plotBox.height,
        svgHeight: svg.getBoundingClientRect().height,
        frameHeight: plot.parentElement.getBoundingClientRect().height,
        footerGap: footer.getBoundingClientRect().top - plotBox.bottom,
      }
    })
    expect(Math.abs(geometry.svgHeight - geometry.plotHeight)).toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.frameHeight - geometry.plotHeight)).toBeLessThanOrEqual(1)
    expect(geometry.footerGap).toBeGreaterThanOrEqual(23)
    expect(geometry.footerGap).toBeLessThanOrEqual(25)
    if (testInfo.project.name === 'desktop') {
      expect(geometry.topDelta).toBeLessThanOrEqual(1)
      expect(geometry.bottomDelta).toBeLessThanOrEqual(1)
      expect(geometry.plotHeight).toBeGreaterThan(240)
    } else {
      expect(geometry.stackedGap).toBeGreaterThanOrEqual(19)
      expect(Math.abs(geometry.plotHeight - 240)).toBeLessThanOrEqual(1)
    }
  }).toPass({ timeout: 5_000 })
  await activity.focus()
  await page.keyboard.press('End')
  await expect(
    activity.getByText('Design system milestone reached', { exact: true }),
  ).toBeInViewport()
  const period = page.getByRole('combobox', { name: 'Revenue period' })
  await period.click()
  await page.getByRole('option', { name: 'Last 7 days', exact: true }).click()
  await expect(chart.locator('[data-number-state] .sr-only').first()).toHaveText('$9,200')
  await expect(chart.locator('[data-number-state]').first()).toHaveAttribute(
    'data-number-state',
    'idle',
  )
  await expect(chart.getByText('Oct 28 – Nov 3 · Revenue in USD', { exact: true })).toBeVisible()
  const weeklyUrl = page.url()
  expect(new URL(weeklyUrl).searchParams.has('period')).toBe(true)
  await page.reload()
  await expect(period).toHaveText('Last 7 days')
  await expect(chart.getByText('Oct 28 – Nov 3 · Revenue in USD', { exact: true })).toBeVisible()
  await period.click()
  await page.getByRole('option', { name: 'Last 30 days', exact: true }).click()
  await expect(chart.getByText('Oct 5 – Nov 3 · Revenue in USD', { exact: true })).toBeVisible()
  await expect(page).toHaveURL((url) => !url.searchParams.has('period'))
  await page.goBack()
  await expect(page).toHaveURL(weeklyUrl)
  await expect(period).toHaveText('Last 7 days')
  await page.goForward()
  await expect(period).toHaveText('Last 30 days')
  await expectNoPageOverflow(page)

  await page.getByRole('heading', { name: 'Overview', level: 1, exact: true }).click()
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  const screenshot = testInfo.outputPath('overview.png')
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' })
  await testInfo.attach('Overview viewport', { path: screenshot, contentType: 'image/png' })
  expect(browserErrors).toEqual([])
})

for (const locale of ['en-US', 'ko-KR'] as const) {
  for (const compact of [false, true]) {
    test(`aligns overview footer dividers in ${locale}, ${compact ? 'compact' : 'normal'} layout, while loading and ready`, async ({
      page,
    }, testInfo) => {
      const korean = locale === 'ko-KR'
      const labels = {
        revenue: korean ? '매출 현황' : 'Revenue overview',
        activity: korean ? '최근 활동' : 'Recent activity',
      }
      await page.goto('/settings')
      await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
      if (compact) {
        await page.getByRole('switch', { name: 'Compact layout', exact: true }).click()
        await page.getByRole('button', { name: 'Save changes', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
      }
      if (korean) {
        await page.getByRole('button', { name: 'Language', exact: true }).click()
        await page.getByRole('menuitemradio', { name: '한국어', exact: true }).click()
      }
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await page.evaluate(async () => {
        await Promise.all(
          ['400', '500', '600'].map((weight) =>
            document.fonts.load(
              `${weight} 16px Pretendard`,
              'Revenue overview Recent activity Explore projects Loading revenue… Oct 5 – Nov 3 · Revenue in USD 매출 현황 최근 활동 프로젝트 살펴보기 매출을 불러오는 중… 10월 5일 – 11월 3일 · 매출 단위: USD',
            ),
          ),
        )
        await document.fonts.ready
      })
      if (testInfo.project.name === 'mobile') {
        await page
          .getByRole('button', { name: korean ? '사이드바 전환' : 'Toggle Sidebar', exact: true })
          .click()
      }
      // Register before navigation to capture the real demo request's cold-loading frame.
      const cold = page.waitForFunction(overviewPanelGeometry, { ...labels, loading: true })
      await page.getByRole('link', { name: korean ? '개요' : 'Overview', exact: true }).click()
      const loadingHandle = await cold
      const loading = await loadingHandle.jsonValue()
      await loadingHandle.dispose()
      const sideBySide = testInfo.project.name === 'desktop'
      expectOverviewPanelFooters(loading, sideBySide)

      const chart = page.getByLabel(labels.revenue, { exact: true })
      await expect(chart).toHaveAttribute('aria-busy', 'false')
      await page.evaluate(() => document.fonts.ready)
      const ready = await page.evaluate(overviewPanelGeometry, { ...labels, loading: false })
      expectOverviewPanelFooters(ready, sideBySide)
      if (!loading || !ready) throw new Error('The overview loading transition is missing.')
      for (const [index, panel] of loading.entries()) {
        const loaded = ready[index]
        if (!loaded) throw new Error('An overview panel disappeared after loading.')
        for (const edge of ['top', 'bottom', 'divider', 'contentCenter'] as const) {
          expect(
            Math.abs(panel[edge] - loaded[edge]),
            `${labels.revenue}: panel ${index} moved its ${edge} after loading`,
          ).toBeLessThanOrEqual(1)
        }
      }
      await expectNoPageOverflow(page)

      if (sideBySide && !compact && !korean) {
        await test.step('Keep shared footer alignment with simulated enlarged, wrapping text', async () => {
          await chart.locator('[data-slot="card-footer"] > span').evaluate((text) => {
            // Model enlarged copy in a constrained text column, not browser zoom.
            text.style.fontSize = '200%'
            text.style.lineHeight = '1.5'
            text.style.maxInlineSize = '18ch'
          })
          const wrapped = await page.evaluate(overviewPanelGeometry, { ...labels, loading: false })
          expectOverviewPanelFooters(wrapped, true)
          if (!wrapped?.[0] || !ready[0]) throw new Error('The wrapped revenue footer is missing.')
          expect(wrapped[0].contentHeight).toBeGreaterThan(wrapped[0].lineHeight)
          expect(wrapped[0].footerHeight).toBeGreaterThan(ready[0].footerHeight)
        })
      }

      const activity = page.getByRole('region', { name: labels.activity, exact: true })
      const explore = page.getByRole('link', {
        name: korean ? '프로젝트 살펴보기' : 'Explore projects',
        exact: true,
      })
      await activity.focus()
      await page.keyboard.press('Tab')
      await expect(explore).toBeFocused()
      await expect(explore).toBeInViewport({ ratio: 1 })
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL('/projects')
    })
  }
}

test('persists the theme and keeps the shell stable through command palette navigation', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Switch to light theme', exact: true }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: 'Website redesign', exact: true })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const shellBounds = () =>
    page.locator('main').evaluate((element) => {
      const header = element.querySelector('header')
      if (!header) throw new Error('The workspace header is missing.')
      return [element, header].flatMap((target) => {
        const { x, width } = target.getBoundingClientRect()
        return [x, width]
      })
    })
  const initialBounds = await shellBounds()
  const expectStableShell = async () => {
    await expect
      .poll(async () => {
        const current = await shellBounds()
        return Math.max(...current.map((value, index) => Math.abs(value - initialBounds[index])))
      })
      .toBeLessThanOrEqual(0.5)
  }
  // Verify the desktop navigation really crosses from an overflowing page to one that fits.
  if (testInfo.project.name === 'desktop') {
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight),
    ).toBe(true)
  }

  await page.keyboard.press('ControlOrMeta+k')
  const search = page.getByRole('dialog', { name: 'Search workspace' })
  await expect(search).toBeVisible()
  await expect(page.locator('body')).toHaveAttribute('data-scroll-locked')
  await expectStableShell()
  await expect(search.getByRole('listbox', { name: 'Suggestions', exact: true })).toBeVisible()
  await search.getByRole('combobox', { name: 'Search workspace', exact: true }).fill('Settings')
  await page.keyboard.press('Enter')
  await expect(search).toBeHidden()
  await expect(page).toHaveURL('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked')
  await expectStableShell()
  if (testInfo.project.name === 'desktop') {
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true)
  }
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Dark A little easier on the eyes.' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ControlOrMeta+k')
  await expect(search).toBeVisible()
  await expect(page.locator('body')).toHaveAttribute('data-scroll-locked')
  await expectStableShell()
  await page.keyboard.press('Escape')
  await expect(search).toBeHidden()
  await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked')
  await expectStableShell()
})

test('returns command palette focus to its button or keyboard opener when dismissed', async ({
  page,
}) => {
  await page.goto('/settings')
  const workspaceName = page.getByRole('textbox', { name: 'Workspace name', exact: true })
  const searchButton = page.getByRole('button', { name: 'Search workspace', exact: true })
  const palette = page.getByRole('dialog', { name: 'Search workspace', exact: true })

  await workspaceName.focus()
  await page.keyboard.press('ControlOrMeta+k')
  await expect(palette).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(palette).toBeHidden()
  await expect(workspaceName).toBeFocused()

  await searchButton.focus()
  await page.keyboard.press('Enter')
  await expect(palette).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(palette).toBeHidden()
  await expect(searchButton).toBeFocused()
})

test('validates, saves and resets workspace preferences across reloads', async ({ page }) => {
  await page.goto('/settings')
  const name = page.getByRole('textbox', { name: 'Workspace name', exact: true })
  const compact = page.getByRole('switch', { name: 'Compact layout', exact: true })
  const save = page.getByRole('button', { name: 'Save changes', exact: true })
  await name.fill('x')
  await save.click()
  await expect(page.getByRole('alert')).toHaveText('Use at least 2 characters')
  await expect(name).toHaveAttribute('aria-invalid', 'true')

  await name.fill('  Product Studio  ')
  await compact.click()
  await save.click()
  await expect(page.getByText('Preferences updated', { exact: true })).toBeVisible()
  await expect(save).toBeDisabled()
  await page.reload()
  await expect(name).toHaveValue('Product Studio')
  await expect(compact).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: 'Reset preferences', exact: true }).click()
  await expect(name).toHaveValue('Acme Studio')
  await expect(compact).toHaveAttribute('aria-checked', 'false')
  await expect(save).toBeDisabled()
  await page.reload()
  await expect(name).toHaveValue('Acme Studio')
  await expect(compact).toHaveAttribute('aria-checked', 'false')
  await expectNoPageOverflow(page)
})

test('keeps support-page actions, tabs, and example text within narrow content areas', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile',
    'Exercise the narrow and enlarged-text layouts once.',
  )
  for (const { width, fontSize } of [
    { width: 320, fontSize: '100%' },
    { width: 390, fontSize: '100%' },
    { width: 412, fontSize: '200%' },
  ]) {
    await page.setViewportSize({ width, height: 915 })
    const openPage = async (path: string) => {
      await page.goto(path)
      await expect(page.locator('#main-content h1')).toBeVisible()
      await page.addStyleTag({ content: `:root { font-size: ${fontSize}; }` })
      await page.evaluate(() => document.fonts.ready)
    }
    const expectCardContentsInside = async () => {
      const overflow = await page
        .locator('[role="tabpanel"][data-state="active"]')
        .evaluate((panel) => {
          const pageBox = document
            .querySelector('[data-slot="page-content"]')!
            .getBoundingClientRect()
          return [...panel.querySelectorAll('[data-slot="card"], button, [data-slot="skeleton"]')]
            .filter((element) => element.getBoundingClientRect().width > 0)
            .map((element) => {
              const box = element.getBoundingClientRect()
              const card = element.parentElement?.closest('[data-slot="card"]')
              const boundary = card?.getBoundingClientRect() ?? pageBox
              return Math.max(boundary.left - box.left, box.right - boundary.right)
            })
        })
      expect(Math.max(...overflow)).toBeLessThanOrEqual(1)
      await expectNoPageOverflow(page)
    }

    await openPage('/settings')
    const name = page.getByRole('textbox', { name: 'Workspace name', exact: true })
    await name.fill(`Workspace ${width} ${'A'.repeat(26)}`)
    const save = page.getByRole('button', { name: 'Save changes', exact: true })
    await name.focus()
    for (let step = 0; step < 6; step += 1) {
      if (await save.evaluate((element) => element === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(save).toBeFocused()
    await expect(save).toBeInViewport({ ratio: 1 })
    await expectCardContentsInside()
    await page.keyboard.press('Enter')
    await expect(save).toBeDisabled()
    await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
    await expectCardContentsInside()

    for (const route of ['/components', '/foundations']) {
      await openPage(route)
      const tabs = page.getByRole('tab')
      await tabs.first().focus()
      await page.keyboard.press('End')
      await expect(tabs.last()).toBeFocused()
      await expect(async () => {
        const boundaries = await tabs.last().evaluate((tab) => {
          const box = tab.getBoundingClientRect()
          const content = document
            .querySelector('[data-slot="page-content"]')!
            .getBoundingClientRect()
          return { left: box.left - content.left, right: content.right - box.right }
        })
        expect(boundaries.left).toBeGreaterThanOrEqual(-1)
        expect(boundaries.right).toBeGreaterThanOrEqual(-1)
      }).toPass()
      await page.keyboard.press('Home')
      await expect(tabs.first()).toBeFocused()
      for (const tab of await tabs.all()) {
        await tab.click()
        await expectCardContentsInside()
      }
      if (route === '/foundations') {
        await page.getByRole('tab', { name: 'Layout', exact: true }).click()
        const report = page.getByText('Global operations report · second half of 2026', {
          exact: true,
        })
        const text = await report.evaluate((element) => ({
          width: element.clientWidth,
          contentWidth: element.scrollWidth,
          height: element.clientHeight,
          contentHeight: element.scrollHeight,
        }))
        expect(text.contentWidth).toBeLessThanOrEqual(text.width + 1)
        expect(text.contentHeight).toBeLessThanOrEqual(text.height + 1)
      }
    }
  }
})

test('aligns paired component example card edges on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Only the desktop examples use paired cards.')
  await page.goto('/components')
  const cardElements = page.locator('[role="tabpanel"][data-state="active"] > [data-slot="card"]')
  await expect(cardElements).toHaveCount(7)
  await page.evaluate(() => document.fonts.ready)
  const cards = await cardElements.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom }
    }),
  )
  expect(cards).toHaveLength(7)
  for (let index = 0; index + 1 < cards.length; index += 2) {
    expect(Math.abs(cards[index]!.top - cards[index + 1]!.top)).toBeLessThanOrEqual(1)
    expect(Math.abs(cards[index]!.bottom - cards[index + 1]!.bottom)).toBeLessThanOrEqual(1)
  }
  const buttons = await page
    .getByRole('tabpanel')
    .getByRole('button')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        size: element.getAttribute('data-size'),
        height: element.getBoundingClientRect().height,
      })),
    )
  for (const button of buttons) {
    expect(button.height).toBe(button.size === 'sm' ? 32 : 36)
  }
})

test('keeps page titles and header badges consistent through responsive sidebar navigation', async ({
  page,
  viewport,
}) => {
  const isMobileLayout = (viewport?.width ?? 1440) < 768
  let badgeAppearance: Record<string, string> | undefined
  const expectPageHeader = async (expectedTitle: string, expectedBadgeLabel?: string) => {
    await test.step(`Check the ${expectedTitle} page header`, async () => {
      const header = page.locator('header[data-slot="page-header"]')
      const title = header.locator('h1[data-slot="page-title"]')
      await expect(header).toHaveCount(1)
      const pageContent = page.locator('#main-content > [data-slot="page-content"]')
      await expect(pageContent).toHaveCount(1)
      await expect(pageContent).toHaveCSS('row-gap', '24px')
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(title).toHaveText(expectedTitle)
      await expect(title).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const titleStyle = await title.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          overflow: element.scrollWidth - element.clientWidth,
        }
      })
      expect(titleStyle).toMatchObject({
        fontSize: '24px',
        fontWeight: '600',
        lineHeight: '32px',
        overflow: 0,
      })
      expect(Number.parseFloat(titleStyle.letterSpacing)).toBeLessThan(0)
      expect(await header.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0)

      const badge = header.locator('[data-slot="page-header-badge"]')
      await expect(badge).toHaveCount(expectedBadgeLabel === undefined ? 0 : 1)
      if (expectedBadgeLabel !== undefined) {
        await expect(badge).toHaveText(expectedBadgeLabel)
        await expect(badge).toHaveAttribute('data-variant', 'outline')
        await expect(badge).toBeVisible()
        const measurements = await header.evaluate((element) => {
          const title = element.querySelector('[data-slot="page-title"]')
          const badge = element.querySelector('[data-slot="page-header-badge"]')
          const description = element.querySelector('[data-slot="page-description"]')
          if (!title || !badge || !description) throw new Error('The page header is incomplete.')
          const titleBox = title.getBoundingClientRect()
          const badgeBox = badge.getBoundingClientRect()
          const style = getComputedStyle(badge)
          return {
            appearance: Object.fromEntries(
              [
                'font-family',
                'font-size',
                'font-weight',
                'line-height',
                'letter-spacing',
                'color',
                'background-color',
                'border-top-color',
                'border-top-width',
                'border-top-style',
                'border-radius',
                'padding-top',
                'padding-right',
                'padding-bottom',
                'padding-left',
              ].map((property) => [property, style.getPropertyValue(property)]),
            ),
            mutedColor: getComputedStyle(description).color,
            gap: badgeBox.left - titleBox.right,
            centerDelta: Math.abs(
              titleBox.top + titleBox.height / 2 - badgeBox.top - badgeBox.height / 2,
            ),
          }
        })
        expect(measurements.appearance).toMatchObject({
          'font-size': '12px',
          'font-weight': '500',
          'line-height': '16px',
          'border-top-width': '1px',
          'border-top-style': 'solid',
          'background-color': 'rgba(0, 0, 0, 0)',
          color: measurements.mutedColor,
        })
        badgeAppearance ??= measurements.appearance
        expect(measurements.appearance).toEqual(badgeAppearance)
        expect(measurements.gap).toBeGreaterThan(0)
        expect(measurements.centerDelta).toBeLessThanOrEqual(1)
      }
      await expectNoPageOverflow(page)
    })
  }
  await page.goto('/')
  await expectPageHeader('Overview')
  const sidebarTrigger = page
    .getByRole('main')
    .getByRole('button', { name: 'Toggle Sidebar', exact: true })
  const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true })
  if (!isMobileLayout) {
    const rail = page.locator('[data-slot="sidebar"][data-state]')
    if ((await rail.getAttribute('data-state')) === 'expanded') await sidebarTrigger.click()
    await expect(rail).toHaveAttribute('data-state', 'collapsed')
    // The collapsed logo and navigation icons share a center line within their buttons.
    await expect
      .poll(() =>
        rail.evaluate((element) => {
          const targets = [
            element.querySelector('[data-slot="sidebar-header"] svg'),
            ...element.querySelectorAll(
              '[data-slot="sidebar-content"] [data-slot="sidebar-menu-button"] > svg:first-child',
            ),
          ]
          if (targets.some((target) => !target)) return Infinity
          const centers = targets.map((target) => {
            const rect = target!.getBoundingClientRect()
            const button = target!
              .closest('[data-slot="sidebar-menu-button"]')!
              .getBoundingClientRect()
            return {
              x: rect.x + rect.width / 2,
              vertical: Math.abs(rect.y + rect.height / 2 - button.y - button.height / 2),
            }
          })
          const xs = centers.map(({ x }) => x)
          return Math.max(
            Math.max(...xs) - Math.min(...xs),
            ...centers.map(({ vertical }) => vertical),
          )
        }),
      )
      .toBeLessThanOrEqual(0.5)
  }
  if (isMobileLayout) {
    await sidebarTrigger.focus()
    await page.keyboard.press('Enter')
    await expect(sidebar).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sidebar).toBeHidden()
    await expect(sidebarTrigger).toBeFocused()
    await sidebarTrigger.click()
  }
  await page.getByRole('link', { name: 'Projects', exact: true }).click()
  await expect(page).toHaveURL('/projects')
  await expectPageHeader('Projects', 'Workspace')
  if (isMobileLayout) {
    await expect(sidebar).toBeHidden()
    await expect(sidebarTrigger).toBeFocused()
    // The keyboard opener disappears when the following navigation changes pages.
    await page.getByRole('textbox', { name: 'Search projects', exact: true }).focus()
    await page.keyboard.press('ControlOrMeta+b')
    await expect(sidebar).toBeVisible()
  }
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL('/settings')
  await expectPageHeader('Settings')
  if (isMobileLayout) {
    await expect(sidebar).toBeHidden()
    await expect(sidebarTrigger).toBeFocused()
  }
  for (const { path, link, title, badgeLabel } of [
    { path: '/analytics', link: 'Analytics', title: 'Analytics', badgeLabel: 'Sample' },
    { path: '/orders', link: 'Orders', title: 'Orders', badgeLabel: 'Sample' },
    { path: '/customers', link: 'Customers', title: 'Customers', badgeLabel: 'Sample' },
    { path: '/inbox', link: 'Inbox', title: 'Inbox', badgeLabel: 'Sample' },
    { path: '/components', link: 'Components', title: 'Components' },
    {
      path: '/foundations',
      link: 'Foundations',
      title: 'Foundations',
      badgeLabel: 'Blueprint standards',
    },
  ]) {
    if (isMobileLayout) await sidebarTrigger.click()
    await page.getByRole('link', { name: link, exact: true }).click()
    await expect(page).toHaveURL(path)
    if (isMobileLayout) await expect(sidebar).toBeHidden()
    await expectPageHeader(title, badgeLabel)
  }
})

test('recovers from an unknown route and returns focus after closing a component dialog', async ({
  page,
}) => {
  await page.goto('/a-page-that-does-not-exist')
  await expect(page.getByText('404 · PAGE NOT FOUND', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Back to overview', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Overview', level: 1, exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  const search = page.getByRole('dialog', { name: 'Search workspace' })
  await search.getByRole('combobox', { name: 'Search workspace', exact: true }).fill('Components')
  await search.getByRole('option', { name: /Components/ }).click()
  await expect(page.getByRole('heading', { name: 'Components', exact: true })).toBeVisible()

  const trigger = page.getByRole('button', { name: 'Open dialog', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Room for your next idea', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Got it', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expectNoPageOverflow(page)
})

test('loads Korean and Latin Pretendard subsets at only the three approved weights', async ({
  page,
  fontCdnRequests,
}) => {
  await page.goto('/components')
  await page.getByRole('tab', { name: 'Typography', exact: true }).click()
  for (const weight of ['400', '500', '600']) {
    const sample = page.getByTestId(`type-sample-${weight}`)
    await expect(sample).toHaveCSS('font-weight', weight)
    await expect(sample).toHaveCSS('font-family', /Pretendard/)
  }
  const faces = await page.evaluate(async () => {
    const weights = ['400', '500', '600']
    const loaded = await Promise.all(
      weights.map((weight) =>
        document.fonts.load(`${weight} 16px Pretendard`, '가나다 Blueprint 0123'),
      ),
    )
    return {
      loaded: loaded.map((items) => items.length),
      declared: [
        ...new Set(
          [...document.fonts]
            .filter((font) => font.family.replaceAll('"', '') === 'Pretendard')
            .map((font) => font.weight),
        ),
      ].sort(),
    }
  })
  expect(faces.loaded.every((count) => count > 0)).toBe(true)
  expect(faces.declared).toEqual(['400', '500', '600'])
  const styles = ['Regular', 'Medium', 'SemiBold']
  expect(
    await page
      .locator('link[rel="stylesheet"][href*="/pretendard@"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(styles.map((style) => `${fontCdnBaseUrl}Pretendard-${style}.css`))
  for (const style of styles) {
    expect(fontCdnRequests).toContain(`${fontCdnBaseUrl}Pretendard-${style}.css`)
    expect(
      fontCdnRequests.some((url) =>
        url.startsWith(`${fontCdnBaseUrl}woff2-dynamic-subset/Pretendard-${style}.subset.`),
      ),
    ).toBe(true)
  }
  await page.getByRole('tab', { name: 'Theme tokens', exact: true }).click()
  await expect(page.getByText('Brand · Blueprint Blue', { exact: true })).toBeVisible()
})
