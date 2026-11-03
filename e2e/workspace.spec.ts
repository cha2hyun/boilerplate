import { expect, test, type Page } from '@playwright/test'
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

test('loads the overview without browser errors and changes the revenue period', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible()
  await expect(page.getByText('Active customers', { exact: true })).toBeVisible()
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

  await page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }).click()
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  const screenshot = testInfo.outputPath('overview.png')
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' })
  await testInfo.attach('Overview viewport', { path: screenshot, contentType: 'image/png' })
  expect(browserErrors).toEqual([])
})

test('persists the theme and navigates with the keyboard command palette', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Switch to light theme', exact: true }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.keyboard.press('ControlOrMeta+k')
  const search = page.getByRole('dialog', { name: 'Search workspace' })
  await expect(search).toBeVisible()
  await search.getByPlaceholder('Where would you like to go?').fill('Settings')
  await page.keyboard.press('Enter')
  await expect(search).toBeHidden()
  await expect(page).toHaveURL('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.locator('#main-content')).toBeFocused()
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Dark A little easier on the eyes.' }),
  ).toHaveAttribute('aria-pressed', 'true')
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

test('navigates through the sidebar and closes the mobile drawer after navigation', async ({
  page,
  viewport,
}) => {
  const isMobileLayout = (viewport?.width ?? 1440) < 768
  await page.goto('/')
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
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible()
  if (isMobileLayout) {
    await expect(sidebar).toBeHidden()
    await expect(sidebarTrigger).toBeFocused()
    // The keyboard opener disappears when the following navigation changes pages.
    await page.getByRole('textbox', { name: 'Search projects', exact: true }).focus()
    await page.keyboard.press('ControlOrMeta+b')
    await expect(sidebar).toBeVisible()
  }
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  if (isMobileLayout) {
    await expect(sidebar).toBeHidden()
    await expect(sidebarTrigger).toBeFocused()
  }
  await expectNoPageOverflow(page)
})

test('recovers from an unknown route and returns focus after closing a component dialog', async ({
  page,
}) => {
  await page.goto('/a-page-that-does-not-exist')
  await expect(page.getByText('404 · PAGE NOT FOUND', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Back to overview', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  const search = page.getByRole('dialog', { name: 'Search workspace' })
  await search.getByPlaceholder('Where would you like to go?').fill('Components')
  await search.getByRole('option', { name: /Components/ }).click()
  await expect(
    page.getByRole('heading', { name: 'The building blocks', exact: true }),
  ).toBeVisible()

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
