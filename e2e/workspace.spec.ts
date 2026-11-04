import { expect, test, type Page } from './fixtures.js'
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
  await period.click()
  await page.getByRole('option', { name: 'Last 30 days', exact: true }).click()
  await expect(chart.getByText('Oct 5 – Nov 3 · Revenue in USD', { exact: true })).toBeVisible()
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
  await search.getByPlaceholder('Where would you like to go?').fill('Settings')
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
  await page.reload()
  await expect(name).toHaveValue('Acme Studio')
  await expect(compact).toHaveAttribute('aria-checked', 'false')
  await expectNoPageOverflow(page)
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
    // Inspect actual visual centers: the avatar must not offset the collapsed menu icons.
    await expect
      .poll(() =>
        rail.evaluate((element) => {
          const targets = [
            element.querySelector('[data-slot="sidebar-header"] svg'),
            ...element.querySelectorAll(
              '[data-slot="sidebar-content"] [data-slot="sidebar-menu-button"] > svg:first-child',
            ),
            element.querySelector('[data-slot="sidebar-footer"] [data-slot="avatar"]'),
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
  await search.getByPlaceholder('Where would you like to go?').fill('Components')
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
  await page.getByRole('tab', { name: 'Theme tokens', exact: true }).click()
  await expect(page.getByText('Brand · Blueprint Blue', { exact: true })).toBeVisible()
})
