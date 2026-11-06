import { expect, test, type Locator, type Page } from './fixtures.js'

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  for (let step = 0; step < 80; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('The control was not reachable within one page of keyboard navigation.')
}

test('opens the component dialog by keyboard, contains focus, and returns it on Escape', async ({
  page,
}) => {
  await page.goto('/components')
  const trigger = page.getByRole('button', { name: 'Open dialog', exact: true })
  await expect(trigger).toBeVisible()
  const unfocusedShadow = await trigger.evaluate((element) => getComputedStyle(element).boxShadow)
  await tabTo(page, trigger)
  await expect(trigger).toBeFocused()
  expect(await trigger.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  await expect(trigger).not.toHaveCSS('box-shadow', unfocusedShadow)
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Room for your next idea', exact: true })
  await expect(dialog).toHaveAccessibleDescription(
    'This dialog handles focus, keyboard navigation, and screen readers for you.',
  )
  const confirm = dialog.getByRole('button', { name: 'Got it', exact: true })
  const close = dialog.getByRole('button', { name: 'Close', exact: true })
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('associates project validation with its field and supports keyboard selection and dismissal', async ({
  page,
}) => {
  await page.goto('/projects')
  const trigger = page.getByRole('button', { name: 'New project', exact: true })
  await tabTo(page, trigger)
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Create a project', exact: true })
  const name = dialog.getByRole('textbox', { name: 'Project name', exact: true })
  await expect(name).toBeFocused()
  await page.keyboard.type('x')
  await page.keyboard.press('Enter')
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAccessibleDescription('Use at least 2 characters.')
  await expect(dialog.getByRole('alert')).toHaveText('Use at least 2 characters.')

  await page.keyboard.type('y')
  await expect(name).toHaveAttribute('aria-invalid', 'false')
  await expect(name).not.toHaveAttribute('aria-describedby')
  await page.keyboard.press('Tab')
  const description = dialog.getByRole('textbox', { name: 'Description (optional)', exact: true })
  await expect(description).toBeFocused()
  await expect(description).toHaveAccessibleDescription(
    'A short summary to keep everyone on the same page. Up to 240 characters.',
  )
  await page.keyboard.press('Tab')
  const status = dialog.getByRole('combobox', { name: 'Status', exact: true })
  await expect(status).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Active', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Paused', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(status).toHaveText('Paused')
  await expect(status).toBeFocused()
  await page.keyboard.press('Escape')
  const discard = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
  await expect(discard.getByRole('button', { name: 'Keep editing', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(discard.getByRole('button', { name: 'Discard changes', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('honors live reduced motion for overlays, loading feedback, and spatial transitions', async ({
  page,
  viewport,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/components')
  await page.getByRole('button', { name: 'Open dialog', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Room for your next idea', exact: true })
  await expect(dialog).toHaveCSS('animation-name', 'enter')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(dialog).toHaveCSS('animation-name', 'none')
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCSS('animation-name', 'none')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const skeletons = page.locator('[data-slot="skeleton"]')
  await expect(skeletons).not.toHaveCount(0)
  for (const skeleton of await skeletons.all()) {
    await expect(skeleton).toHaveCSS('animation-name', 'none')
  }
  await expect(
    page.getByRole('button', { name: 'Processing', exact: true }).locator('svg'),
  ).toHaveCSS('animation-name', 'none')
  const progress = page.getByRole('progressbar', { name: 'Workspace setup', exact: true })
  await page.getByRole('button', { name: 'Advance progress', exact: true }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '76')
  await expect(progress.locator('[data-slot="progress-indicator"]')).toHaveCSS(
    'transition-property',
    'none',
  )
  const notifications = page.getByRole('switch', { name: 'Notifications preview', exact: true })
  await notifications.click()
  await expect(notifications).not.toBeChecked()
  await expect(notifications.locator('[data-slot="switch-thumb"]')).toHaveCSS(
    'transition-property',
    'none',
  )

  const currency = page.getByRole('button', { name: 'Display currency', exact: true })
  await currency.hover()
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCSS('animation-name', 'none')
  await currency.click()
  await expect(page.getByRole('menu')).toHaveCSS('animation-name', 'none')
  await page.keyboard.press('Escape')
  await expect(currency).toBeFocused()

  await page.goto('/projects')
  await page.getByRole('combobox', { name: 'Filter by status', exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCSS('animation-name', 'none')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Actions for Website redesign', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete project', exact: true }).click()
  const confirmation = page.getByRole('alertdialog', { name: 'Delete this project?', exact: true })
  await expect(confirmation).toHaveCSS('animation-name', 'none')
  await expect(page.locator('[data-slot="alert-dialog-overlay"]')).toHaveCSS(
    'animation-name',
    'none',
  )
  await page.keyboard.press('Escape')
  await expect(confirmation).toBeHidden()

  const sidebarTrigger = page.locator('[data-sidebar="trigger"]')
  const desktopMotion =
    (viewport?.width ?? 1440) >= 768
      ? await page.evaluateHandle(() => {
          const rail = document.querySelector<HTMLElement>('[data-slot="sidebar"][data-state]')!
          const container = rail.querySelector<HTMLElement>('[data-slot="sidebar-container"]')!
          const gap = rail.querySelector<HTMLElement>('[data-slot="sidebar-gap"]')!
          const inset = document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')!
          const trigger = document.querySelector<HTMLButtonElement>('[data-sidebar="trigger"]')!
          const media = matchMedia('(prefers-reduced-motion: reduce)')
          const read = () => ({
            state: rail.dataset.state,
            width: container.getBoundingClientRect().width,
            gap: gap.getBoundingClientRect().width,
            insetLeft: inset.getBoundingClientRect().left,
            icons: [...rail.querySelectorAll('[data-slot="sidebar-menu-button"]')].map((button) => {
              const box = button.querySelector('svg')!.getBoundingClientRect()
              return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
            }),
            active: [...rail.getAnimations({ subtree: true }), ...inset.getAnimations()].filter(
              (animation) => animation.pending || animation.playState === 'running',
            ).length,
          })
          const target = read()
          return {
            start() {
              const initial = read()
              let previous = initial
              let changed = false
              let resolveMiddle: (frame: ReturnType<typeof read>) => void
              const middle = new Promise<ReturnType<typeof read>>((resolve) => {
                resolveMiddle = resolve
              })
              const reduced = new Promise<{
                before: ReturnType<typeof read>
                after: ReturnType<typeof read>
                target: ReturnType<typeof read>
              }>((resolve) => {
                const onReduce = (event: MediaQueryListEvent) => {
                  if (!event.matches) return
                  media.removeEventListener('change', onReduce)
                  changed = true
                  const before = previous
                  requestAnimationFrame(() => resolve({ before, after: read(), target }))
                }
                media.addEventListener('change', onReduce)
              })
              const sample = () => {
                if (changed) return
                previous = read()
                const interior =
                  previous.width > Math.min(initial.width, target.width) + 0.5 &&
                  previous.width < Math.max(initial.width, target.width) - 0.5
                if (interior || (previous.state === target.state && previous.active === 0))
                  resolveMiddle(previous)
                requestAnimationFrame(sample)
              }
              trigger.click()
              requestAnimationFrame(sample)
              return { initial, middle, reduced }
            },
          }
        })
      : undefined
  await sidebarTrigger.click()
  if ((viewport?.width ?? 1440) < 768) {
    const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true })
    await expect(sidebar).toHaveCSS('animation-name', 'none')
    await expect(sidebar).toHaveCSS('transition-property', 'none')
    await expect(page.locator('[data-slot="sheet-overlay"]')).toHaveCSS('animation-name', 'none')
    await page.keyboard.press('Escape')
    await expect(sidebar).toBeHidden()
    await expect(sidebarTrigger).toBeFocused()
  } else {
    await expect(page.locator('[data-slot="sidebar-container"]')).toHaveCSS(
      'transition-property',
      'none',
    )
    await expect(page.locator('[data-slot="sidebar-gap"]')).toHaveCSS('transition-property', 'none')
    // Reverse from the reduced-motion endpoint, then change the preference while width is moving.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const transition = await desktopMotion!.evaluateHandle((motion) => motion.start())
    const middle = await transition.evaluate(async (motion) => motion.middle)
    expect(middle.active).toBeGreaterThan(0)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const interrupted = await transition.evaluate(async (motion) => motion.reduced)
    const initial = await transition.evaluate((motion) => motion.initial)
    expect(interrupted.before.width).toBeGreaterThan(
      Math.min(initial.width, interrupted.target.width) + 0.5,
    )
    expect(interrupted.before.width).toBeLessThan(
      Math.max(initial.width, interrupted.target.width) - 0.5,
    )
    expect(interrupted.after.active).toBe(0)
    expect(interrupted.after.state).toBe(interrupted.target.state)
    for (const property of ['width', 'gap', 'insetLeft'] as const) {
      expect(
        Math.abs(interrupted.after[property] - interrupted.target[property]),
      ).toBeLessThanOrEqual(0.5)
    }
    for (const [index, icon] of interrupted.after.icons.entries()) {
      expect(Math.abs(icon.x - interrupted.target.icons[index]!.x)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(icon.y - interrupted.target.icons[index]!.y)).toBeLessThanOrEqual(0.5)
    }
    await expect(sidebarTrigger).toBeFocused()
    await transition.dispose()
    await desktopMotion!.dispose()
  }
})

test('keeps named shell actions and project validation reachable at 200% text on mobile', async ({
  page,
  viewport,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This check uses the 412px mobile viewport.')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/projects')
  await page.addStyleTag({ content: ':root { font-size: 200%; }' })
  await expect(page.locator('html')).toHaveCSS('font-size', '32px')
  const shellActions = [
    page.locator('[data-sidebar="trigger"]'),
    page.getByRole('button', { name: 'Search workspace', exact: true }),
    page.getByRole('button', { name: /Switch to (light|dark) theme/ }),
    page.getByRole('button', { name: 'Language', exact: true }),
    page.getByRole('button', { name: 'Display currency', exact: true }),
  ]
  for (const action of shellActions) {
    await expect(action).toBeVisible()
    await expect(action).toBeInViewport({ ratio: 1 })
  }
  await expect(page.locator('[data-sidebar="trigger"]')).toHaveAccessibleName('Toggle Sidebar')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412)

  const sidebarTrigger = page.locator('[data-sidebar="trigger"]')
  for (const width of [412, 320]) {
    await page.setViewportSize({ width, height: viewport?.height ?? 915 })
    await sidebarTrigger.tap()
    const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true })
    await expect(sidebar).toBeInViewport({ ratio: 1 })
    const sidebarClose = sidebar.getByRole('button', { name: 'Close', exact: true })
    await expect(sidebarClose).toBeInViewport({ ratio: 1 })
    const brand = sidebar.getByRole('link', { name: 'Blueprint overview', exact: true })
    const brandBox = await brand.boundingBox()
    const closeBox = await sidebarClose.boundingBox()
    if (!brandBox || !closeBox) throw new Error('The sidebar header controls are missing.')
    expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(closeBox.x)
    expect(
      Math.abs(brandBox.y + brandBox.height / 2 - closeBox.y - closeBox.height / 2),
    ).toBeLessThanOrEqual(1)
    await sidebarClose.tap()
    await expect(sidebar).toBeHidden()
    await expect(sidebarTrigger).toBeFocused()

    await page.getByRole('button', { name: 'Search workspace', exact: true }).tap()
    const search = page.getByRole('dialog', { name: 'Search workspace', exact: true })
    const searchInput = search.getByRole('combobox')
    await searchInput.fill('A long search value that reaches the end of the input')
    const searchClose = search.getByRole('button', { name: 'Close', exact: true })
    const inputBox = await searchInput.boundingBox()
    const searchCloseBox = await searchClose.boundingBox()
    if (!inputBox || !searchCloseBox) throw new Error('The search controls are missing.')
    expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(searchCloseBox.x)
    await expect(searchClose).toBeInViewport({ ratio: 1 })
    await searchClose.tap()
    await expect(search).toBeHidden()
  }
  await page.setViewportSize({ width: 412, height: viewport?.height ?? 915 })

  const trigger = page.getByRole('button', { name: 'New project', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Create a project', exact: true })
  await expect(dialog).toBeInViewport({ ratio: 1 })
  const name = dialog.getByRole('textbox', { name: 'Project name', exact: true })
  await expect(name).toBeFocused()
  await page.keyboard.type('x')
  await page.keyboard.press('Enter')
  const error = dialog.getByRole('alert')
  await expect(name).toHaveAccessibleDescription('Use at least 2 characters.')
  await error.scrollIntoViewIfNeeded()
  await expect(error).toBeInViewport({ ratio: 1 })
  const save = dialog.getByRole('button', { name: 'Create project', exact: true })
  await tabTo(page, save)
  await expect(save).toBeInViewport({ ratio: 1 })
  const dimensions = await dialog.evaluate((element) => ({
    content: element.scrollWidth,
    available: element.clientWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.available + 1)
  await page.keyboard.press('Escape')
  const discard = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
  await expect(discard).toBeInViewport({ ratio: 1 })
  const discardButton = discard.getByRole('button', { name: 'Discard changes', exact: true })
  await tabTo(page, discardButton)
  await expect(discardButton).toBeInViewport({ ratio: 1 })
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('keeps the collapsed navigation scrollable in a short landscape viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet', 'This check uses the collapsed tablet sidebar.')
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/projects')
  const sidebar = page.locator('[data-slot="sidebar"][data-state="collapsed"]')
  const content = sidebar.locator('[data-slot="sidebar-content"]')
  await expect(content).toHaveCSS('overflow-y', 'auto')
  const settings = content.getByRole('link', { name: 'Settings', exact: true })
  await expect(settings).not.toBeInViewport()
  await content.hover()
  await page.mouse.wheel(0, 600)
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect(settings).toBeInViewport({ ratio: 1 })
  await settings.click()
  await expect(page).toHaveURL('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
})

test('exposes page and section headings without promoting metric values to headings', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Document semantics do not depend on viewport.')
  for (const [route, title, sections] of [
    ['/', 'Overview', ['Revenue overview', 'Recent activity']],
    [
      '/analytics',
      'Analytics',
      ['Audience overview', 'Sessions by device', 'Traffic sources', 'Top pages'],
    ],
    ['/projects', 'Projects', ['All projects']],
    ['/orders', 'Orders', ['All orders']],
    ['/customers', 'Customers', ['Customer directory']],
    ['/settings', 'Settings', ['Workspace preferences']],
  ] as const) {
    await page.goto(route)
    const main = page.locator('#main-content')
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(title)
    for (const section of sections) {
      await expect(
        main.getByRole('heading', { level: 2, name: new RegExp(`^${section}`) }),
      ).toBeVisible()
    }
    await expect(main.locator('[data-metric-card]').getByRole('heading')).toHaveCount(0)
  }
})

for (const [locale, width, show, hide, description, result] of [
  [
    'en-US',
    412,
    'Show summary',
    'Hide summary',
    'Your team’s work, organized in one place.',
    'Showing 1–6 of 6 projects',
  ],
  [
    'ko-KR',
    320,
    '요약 펼치기',
    '요약 접기',
    '팀의 작업을 한곳에서 관리하세요.',
    '전체 프로젝트 6개 중 1–6개 표시',
  ],
] as const) {
  test(`keeps project summaries optional and management instructions complete at 200% text (${locale})`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'The narrow-screen list composition is mobile-specific.',
    )
    await page.setViewportSize({ width, height: 915 })
    await page.addInitScript((locale) => {
      localStorage.setItem(
        'blueprint-locale-preferences',
        JSON.stringify({ state: { locale, currency: 'USD' }, version: 1 }),
      )
    }, locale)
    await page.goto('/projects')
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('button', { name: 'Website redesign', exact: true })).toBeVisible()
    const toggle = page.getByRole('button', { name: show, exact: true })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('[data-metric-card]:visible')).toHaveCount(0)
    await toggle.click()
    await expect(page.locator('[data-metric-card]:visible')).toHaveCount(3)
    await page.getByRole('button', { name: hide, exact: true }).click()
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    for (const label of [description, result]) {
      const text = page.getByText(label, { exact: true })
      await expect(text).toBeVisible()
      const bounds = await text.evaluate((element) => ({
        width: element.clientWidth,
        contentWidth: element.scrollWidth,
        height: element.clientHeight,
        contentHeight: element.scrollHeight,
      }))
      expect(bounds.width, label).toBeGreaterThan(0)
      expect(bounds.height, label).toBeGreaterThan(0)
      expect(bounds.contentWidth, label).toBeLessThanOrEqual(bounds.width + 1)
      expect(bounds.contentHeight, label).toBeLessThanOrEqual(bounds.height + 1)
    }
    const card = page.locator('[data-slot="card"]').filter({ has: page.getByRole('table') })
    const toolbar = card.locator('[data-slot="card-header"]')
    // Active filters and a selection expose the reset and longer export actions.
    await toolbar.getByRole('textbox').fill('Website')
    const row = card
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: 'Website redesign', exact: true }) })
    await row.getByRole('checkbox').check()
    const clipped = await toolbar.evaluate((header) => {
      const boundary = header.closest('[data-slot="card"]')!.getBoundingClientRect()
      return [...header.querySelectorAll('button,input,h2,[data-slot="card-description"] > span')]
        .filter(
          (element) =>
            getComputedStyle(element).visibility !== 'hidden' &&
            element.getBoundingClientRect().width > 0,
        )
        .filter((element) => {
          const bounds = element.getBoundingClientRect()
          return bounds.left < boundary.left - 1 || bounds.right > boundary.right + 1
        })
        .map((element) => element.getAttribute('aria-label') ?? element.textContent)
    })
    expect(
      clipped,
      'The card must show the entire toolbar, including selected export and reset',
    ).toEqual([])
    const status = toolbar.getByRole('combobox')
    const statusBounds = await status.evaluate((trigger) => {
      const value = trigger.querySelector('[data-slot="select-value"]')!
      const range = document.createRange()
      range.selectNodeContents(value)
      const label = range.getBoundingClientRect()
      const control = trigger.getBoundingClientRect()
      return Math.max(
        control.left - label.left,
        label.right - control.right,
        control.top - label.top,
        label.bottom - control.bottom,
      )
    })
    expect(
      statusBounds,
      'The enlarged selected status fits inside its own control',
    ).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
  })
}

test('keeps compact customer identity and actions visible while scrolling a narrow table', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile',
    'A narrow table requires a compact pinned identifier.',
  )
  for (const width of [320, 412]) {
    await page.setViewportSize({ width, height: 915 })
    await page.goto('/customers')
    const region = page.getByRole('region', { name: 'Customers table', exact: true })
    const identity = page.getByRole('button', { name: 'View customer Olivia Rhye', exact: true })
    await expect(identity).toBeVisible()
    const row = identity.locator('xpath=ancestor::tr')
    const first = row.getByRole('cell').first()
    const last = row.getByRole('cell').last()
    await region.evaluate((element) => {
      element.scrollLeft = element.scrollWidth
    })
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    const [frame, name, actions] = await Promise.all([
      region.boundingBox(),
      first.boundingBox(),
      last.boundingBox(),
    ])
    if (!frame || !name || !actions) throw new Error('The customer table layout is missing.')
    expect(name.x).toBeGreaterThanOrEqual(frame.x - 1)
    expect(name.width).toBeLessThanOrEqual(140)
    expect(name.x + name.width + 60).toBeLessThanOrEqual(actions.x)
    expect(actions.x + actions.width).toBeLessThanOrEqual(frame.x + frame.width + 1)
    await identity.click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Olivia Rhye', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(identity).toBeFocused()
  }
})
