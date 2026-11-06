import { expect, test, type Locator, type Page } from './fixtures.js'

async function signIn(page: Page) {
  await page.getByRole('button', { name: 'Fill demo credentials', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('restores a protected account in this tab and requires sign-in after logout', async ({
  page,
  context,
}) => {
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0)
  await page.getByLabel('Email', { exact: true }).fill('someone@example.com')
  await page.getByLabel('Password', { exact: true }).fill('invalid-demo-value')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await signIn(page)
  await expect(page).toHaveURL('/account')
  await expect(page.getByText('admin@example.com', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Alex Morgan', { exact: true })).toBeVisible()
  const another = await context.newPage()
  await another.goto('/account')
  await expect(another.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await another.close()
  await page.getByRole('link', { name: 'View workspace users' }).click()
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
})

test('restores a user deep link and keeps demo invitations and access changes on reload', async ({
  page,
}) => {
  await page.goto('/users?q=Alex&id=usr_demo')
  await signIn(page)
  await expect(page).toHaveURL(/\/users\?/)
  const self = page.getByRole('dialog', { name: 'Alex Morgan' })
  await expect(self).toBeVisible()
  await expect(self.getByRole('button', { name: 'Edit access' })).toHaveCount(0)
  await self.press('Escape')
  const search = page.getByRole('searchbox', { name: 'Search users' })
  await expect(search).toHaveValue('Alex')
  await search.fill('')
  await page.getByRole('button', { name: 'Invite user', exact: true }).click()
  const invite = page.getByRole('dialog', { name: 'Invite user' })
  await invite.getByLabel('Name', { exact: true }).fill('Casey Sample')
  await invite.getByLabel('Email', { exact: true }).fill('casey@example.com')
  await invite.getByRole('button', { name: 'Create invitation' }).click()
  await expect(invite).toBeHidden()
  const details = page.getByRole('dialog', { name: 'Casey Sample', exact: true })
  await expect(details.getByText('Invited', { exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Edit access' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit access', exact: true })
  await edit.getByRole('combobox', { name: 'Role' }).click()
  await page.getByRole('option', { name: 'Viewer', exact: true }).click()
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(edit).toBeHidden()
  await page.reload()
  await expect(details.getByText('Viewer', { exact: true })).toBeVisible()
  await expect(details.getByText('casey@example.com', { exact: true })).toBeVisible()
})

test('keeps the signed-in session when a draft blocks sign-out', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'One browser covers the route and draft handshake.',
  )
  await page.goto('/login')
  await signIn(page)
  await expect(page).toHaveURL('/account')
  await page.goto('/settings')
  const name = page.getByRole('textbox', { name: 'Workspace name', exact: true })
  await name.fill('Unsaved workspace')
  const signOut = async () => {
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
  }
  await signOut()
  const prompt = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
  await prompt.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible()
  await expect(name).toHaveValue('Unsaved workspace')
  await signOut()
  await prompt.getByRole('button', { name: 'Discard changes' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  await page.goto('/account')
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
})

test('rechecks a protected document restored after its tab session ended', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The pageshow session contract is shared.')
  for (const path of ['/account', '/users?q=Alex']) {
    await page.goto(path)
    await signIn(page)
    await expect(page.getByText('admin@example.com', { exact: true })).toBeVisible()
    // Playwright disables Chromium BFCache by default. Deliver its persisted pageshow event
    // to the still-mounted document after the same tab's other document has signed out.
    await page.evaluate(() => {
      sessionStorage.removeItem('blueprint.demo.session.v1')
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
    await expect(page.getByText('Alex Morgan', { exact: true })).toHaveCount(0)
    expect(new URL(page.url()).searchParams.get('returnTo')).toBe(path)
  }
})

// Select actual interactive descendants so additions inherit the contract without opting in.
const headerControls =
  'button, a[href], input, select, textarea, summary, [contenteditable="true"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'

async function checkHeaderActions(page: Page, toolbar: Locator, signedIn: boolean) {
  // The left edge owns only the sidebar toggle and breadcrumbs; a misplaced action must fail too.
  const outside = page
    .locator('header')
    .filter({ has: toolbar })
    .locator(
      `:is(${headerControls}):not([data-slot="sidebar-trigger"], [data-slot="breadcrumb"] *, [data-slot="header-actions"] *)`,
    )
    .filter({ visible: true })
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`))
    await page.mouse.move(0, 0)
    await expect(outside).toHaveCount(0)
    const search = toolbar.getByRole('button', { name: 'Search workspace', exact: true })
    await expect(search).toHaveAttribute('data-header-search', 'true')
    await expect(toolbar.locator('[data-header-search="true"]')).toHaveCount(1)
    for (const name of [
      'Language',
      'Display currency',
      `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`,
    ]) {
      await expect(toolbar.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await expect(
      signedIn
        ? toolbar.getByRole('button', { name: 'Account menu', exact: true })
        : toolbar.getByRole('link', { name: 'Sign in', exact: true }),
    ).toBeVisible()

    const controls = toolbar.locator(headerControls).filter({ visible: true })
    for (const control of await controls.all()) await expect(control).toHaveAccessibleName(/\S/)
    const layout = await toolbar.evaluate((row, selector) => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      const rowBox = row.getBoundingClientRect()
      const actions = [...row.querySelectorAll(selector)]
        .filter((action) => action.checkVisibility())
        .map((action) => {
          const box = action.getBoundingClientRect()
          const style = getComputedStyle(action)
          const icons = [...action.querySelectorAll('svg')]
            .filter((svg) => svg.checkVisibility())
            .map((svg) => {
              const glyph = svg.getBoundingClientRect()
              return {
                width: glyph.width,
                height: glyph.height,
                xOffset: glyph.left + glyph.width / 2 - (box.left + box.width / 2),
                yOffset: glyph.top + glyph.height / 2 - (box.top + box.height / 2),
              }
            })
          return {
            name: action.getAttribute('aria-label') ?? action.textContent?.trim(),
            expandedSearch:
              action.getAttribute('data-header-search') === 'true' &&
              matchMedia('(min-width: 80rem)').matches,
            width: box.width,
            height: box.height,
            rowOffset: box.top + box.height / 2 - (rowBox.top + rowBox.height / 2),
            border: style.borderWidth,
            background: style.backgroundColor,
            image: style.backgroundImage,
            shadow: style.boxShadow,
            icons,
          }
        })
      return { rem, actions }
    }, headerControls)
    for (const action of layout.actions) {
      const label = `${theme} ${signedIn ? 'signed in' : 'signed out'}: ${action.name}`
      expect(action.height, label).toBeCloseTo(layout.rem * (action.expandedSearch ? 2.25 : 2), 1)
      if (action.expandedSearch) expect(action.width, label).toBeGreaterThan(layout.rem * 2)
      else expect(action.width, label).toBeCloseTo(layout.rem * 2, 1)
      expect(Math.abs(action.rowOffset), label).toBeLessThanOrEqual(0.5)
      expect([action.border, action.background, action.image, action.shadow], label).toEqual([
        '0px',
        'rgba(0, 0, 0, 0)',
        'none',
        'none',
      ])
      expect(action.icons.length, label).toBeGreaterThan(0)
      for (const icon of action.icons) {
        expect(icon.width, label).toBeCloseTo(layout.rem, 1)
        expect(icon.height, label).toBeCloseTo(layout.rem, 1)
        expect(Math.abs(icon.yOffset), label).toBeLessThanOrEqual(0.5)
        if (!action.expandedSearch) expect(Math.abs(icon.xOffset), label).toBeLessThanOrEqual(0.5)
      }
    }
  }
}

test('keeps all header actions aligned and accessible before and after sign-in', async ({
  page,
}) => {
  await page.goto('/orders')
  const toolbar = page.locator('[data-slot="header-actions"]')
  await expect(toolbar).toBeVisible()
  await checkHeaderActions(page, toolbar, false)
  const signInLink = toolbar.getByRole('link', { name: 'Sign in', exact: true })
  await toolbar.getByRole('button', { name: 'Display currency', exact: true }).focus()
  const actionCount = await toolbar.locator(headerControls).filter({ visible: true }).count()
  for (let step = 0; step < actionCount; step++) {
    await page.keyboard.press('Tab')
    if (await signInLink.evaluate((link) => link === document.activeElement)) break
  }
  await expect(signInLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await signIn(page)
  await checkHeaderActions(page, toolbar, true)
  await toolbar.getByRole('button', { name: 'Account menu', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'My account', exact: true })).toBeVisible()
})
