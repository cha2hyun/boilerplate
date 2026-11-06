import type { Request } from '@playwright/test'
import {
  exchangeRateUrl,
  expect,
  fontCdnBaseUrl,
  test,
  type Locator,
  type Page,
} from './fixtures.js'

async function signIn(page: Page) {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

function waitForLoginResponse(page: Page) {
  const endpoint = new URL('/api/demo-login', page.url()).href
  return page.waitForResponse(
    (response) => response.url() === endpoint && response.request().method() === 'POST',
  )
}

function tabSession(page: Page) {
  return page.evaluate(() => sessionStorage.getItem('blueprint.demo.session.v1'))
}

async function selectLoginResponse(page: Page, name: 'Slow' | 'Server error') {
  await page.getByRole('button', { name: /^Demo response/ }).click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
}

const ownerAvatar = '/avatars/soohyun-chae.svg'

async function expectLoadedAvatar(avatar: Locator, src: string) {
  await expect(avatar).toHaveAttribute('data-profile-state', 'image')
  const image = avatar.locator('img')
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('alt', '')
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => ({
        src: element.currentSrc,
        loaded: element.complete && element.naturalWidth > 0 && element.naturalHeight > 0,
      })),
    )
    .toEqual({ src: new URL(src, avatar.page().url()).href, loaded: true })
  await expect(avatar.locator('[data-slot="skeleton"]')).toHaveCount(0)
  await expect(avatar.locator('[data-slot="avatar-fallback"]')).toHaveCount(0)
}

test('shows the public order preview only on desktop and keeps sign-in reachable', async ({
  page,
  context,
  exchangeRateMock,
}, testInfo) => {
  // The public USD sample should not fetch private orders or exchange rates, even for a KRW user.
  await page.addInitScript(() => {
    localStorage.setItem(
      'blueprint-locale-preferences',
      JSON.stringify({ state: { locale: 'en-US', currency: 'KRW' }, version: 1 }),
    )
  })
  const orderRequests: string[] = []
  context.on('request', (request) => {
    if (/^\/api\/orders(?:\/|$)/.test(new URL(request.url()).pathname)) {
      orderRequests.push(request.method())
    }
  })
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('A viewport is required for responsive login coverage.')
  const desktop = testInfo.project.name === 'desktop'
  const preview = page.getByRole('complementary', { name: 'Workspace preview' })
  await page.goto('/login')
  for (const width of desktop ? [1279, 1280] : [viewport.width]) {
    await page.setViewportSize({ width, height: viewport.height })
    await expect(page.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Sign in with Microsoft' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    if (width < 1280) {
      await expect(preview).toBeHidden()
      continue
    }
    await expect(preview).toBeVisible()
    await expect(preview.getByRole('cell', { name: /^ORD-/ })).toHaveCount(3)
    for (const id of ['ORD-1042', 'ORD-1041', 'ORD-1040']) {
      await expect(preview.getByRole('cell', { name: id, exact: true })).toBeInViewport()
    }
    await page.getByRole('button', { name: 'Language (English)', exact: true }).click()
    await page.getByRole('menuitemradio', { name: '한국어', exact: true }).click()
    await expect(page.getByRole('heading', { name: '워크스페이스 로그인', level: 1 })).toBeVisible()
    await expect(page.getByRole('complementary', { name: '워크스페이스 미리보기' })).toBeVisible()
  }
  expect(orderRequests).toEqual([])
  expect(exchangeRateMock.requests).toBe(0)
})

test('restores a protected account in this tab and requires sign-in after logout', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
  await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0)
  const email = page.getByLabel('Email', { exact: true })
  const password = page.getByLabel('Password', { exact: true })
  await expect(email).toHaveValue('admin@example.com')
  await expect(password).toHaveAttribute('type', 'password')
  await expect(password).toHaveValue('Blueprint123!')
  await email.fill('someone@example.com')
  await password.fill('invalid-demo-value')
  const unauthorized = waitForLoginResponse(page)
  await signIn(page)
  expect((await unauthorized).status()).toBe(401)
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await tabSession(page)).toBeNull()
  expect(new URL(page.url()).pathname).toBe('/login')
  await email.fill('admin@example.com')
  await password.fill('Blueprint123!')
  const accepted = waitForLoginResponse(page)
  await signIn(page)
  expect((await accepted).status()).toBe(200)
  await expect(page).toHaveURL('/account')
  expect(await tabSession(page)).toBe('usr_demo')
  await expect(page.getByRole('main').getByText('admin@example.com', { exact: true })).toBeVisible()
  await page.reload()
  const profile = page.getByRole('main')
  await expect(profile.getByText('soohyun chae', { exact: true })).toBeVisible()
  await expect(
    profile
      .locator('dt')
      .filter({ hasText: /^First name$/ })
      .locator('+ dd'),
  ).toHaveText('soohyun')
  await expect(
    profile
      .locator('dt')
      .filter({ hasText: /^Last name$/ })
      .locator('+ dd'),
  ).toHaveText('chae')
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('A viewport is required for account layout coverage.')
  const widths =
    testInfo.project.name === 'desktop' ? [640, 767, 768, viewport.width] : [viewport.width]
  const emailLabel = profile.getByText('Email', { exact: true })
  const emailValue = profile.getByText('admin@example.com', { exact: true })
  for (const width of widths) {
    await page.setViewportSize({ width, height: viewport.height })
    const label = await emailLabel.boundingBox()
    const value = await emailValue.boundingBox()
    if (!label || !value) throw new Error(`Expected visible account email at ${width}px.`)
    if (width < 768) {
      expect(value.x).toBeCloseTo(label.x, 1)
      expect(value.y).toBeGreaterThanOrEqual(label.y + label.height)
    } else {
      expect(value.y).toBeCloseTo(label.y, 1)
      expect(value.x).toBeGreaterThanOrEqual(label.x + label.width)
    }
  }
  const another = await context.newPage()
  await another.goto('/account')
  await expect(another.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
  await another.close()
  await page.getByRole('link', { name: 'View workspace users' }).click()
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
})

test('retries a failed demo login from the same form after a service error', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'The one-attempt error and retry contract is shared.',
  )
  await page.goto('/account')
  await selectLoginResponse(page, 'Server error')
  const unavailable = waitForLoginResponse(page)
  await signIn(page)
  expect((await unavailable).status()).toBe(503)
  await expect(page.getByRole('alert')).toContainText('Try signing in again.')
  expect(await tabSession(page)).toBeNull()
  expect(new URL(page.url()).pathname).toBe('/login')
  await page.getByRole('button', { name: /^Demo response/ }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Normal' })).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('admin@example.com')
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('Blueprint123!')
  const retry = waitForLoginResponse(page)
  await signIn(page)
  expect((await retry).status()).toBe(200)
  await expect(page).toHaveURL('/account')
  await expect(page.getByText('Signed in to the demo account.', { exact: true })).toBeVisible()
  expect(await tabSession(page)).toBe('usr_demo')
})

test('restores a user deep link and keeps demo invitations and access changes on reload', async ({
  page,
  context,
}) => {
  await page.goto('/users?q=soohyun&id=usr_demo')
  const loginOrigin = new URL(page.url()).origin
  const attemptedEmail = 'unused@example.invalid'
  const attemptedPassword = 'unused-private-input'
  const unexpectedRequests: string[] = []
  const loginEndpoint = new URL('/api/demo-login', loginOrigin).href
  const loginRequests: Request[] = []
  const popups: Page[] = []
  page.on('popup', (popup) => popups.push(popup))
  const observeLogin = (request: Request) => {
    const url = new URL(request.url())
    const expectedExternalAsset =
      !request.isNavigationRequest() &&
      (url.href.startsWith(fontCdnBaseUrl) || url.href === exchangeRateUrl)
    if (request.method() === 'POST' && url.href === loginEndpoint) {
      loginRequests.push(request)
    } else if (
      (url.origin !== loginOrigin && !expectedExternalAsset) ||
      !['GET', 'HEAD'].includes(request.method())
    ) {
      unexpectedRequests.push(`${request.method()} ${url.origin}`)
    }
    if (
      [...url.searchParams.values()].some(
        (value) => value.includes(attemptedEmail) || value.includes(attemptedPassword),
      )
    ) {
      unexpectedRequests.push('login input in request URL')
    }
  }
  context.on('request', observeLogin)
  await page.getByLabel('Email', { exact: true }).fill(attemptedEmail)
  await page.getByLabel('Password', { exact: true }).fill(attemptedPassword)
  await selectLoginResponse(page, 'Slow')
  const accepted = waitForLoginResponse(page)
  await page.getByRole('button', { name: 'Sign in with Microsoft', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Signing in with Microsoft…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled()
  expect(await tabSession(page)).toBeNull()
  expect(new URL(page.url()).pathname).toBe('/login')
  // A second form submit during the provider request must not start another sign-in.
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
  expect((await accepted).status()).toBe(200)
  await expect(page).toHaveURL(
    (url) =>
      url.origin === loginOrigin &&
      url.pathname === '/users' &&
      url.searchParams.get('q') === 'soohyun' &&
      url.searchParams.get('id') === 'usr_demo',
  )
  const self = page.getByRole('dialog', { name: 'soohyun chae' })
  await expect(self).toBeVisible()
  context.off('request', observeLogin)
  expect(popups).toHaveLength(0)
  expect(loginRequests).toHaveLength(1)
  expect(loginRequests[0]?.postDataJSON()).toEqual({ method: 'microsoft', scenario: 'slow' })
  expect(unexpectedRequests).toEqual([])
  await expect(self.getByRole('button', { name: 'Edit access' })).toHaveCount(0)
  await self.press('Escape')
  const search = page.getByRole('searchbox', { name: 'Search users' })
  await expect(search).toHaveValue('soohyun')
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
  await page.getByRole('button', { name: 'Sign in with Microsoft' }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/login')
  await expect(page).toHaveURL('/')
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
  await expect(page.getByRole('heading', { level: 1, name: 'Workspace sign-in' })).toBeVisible()
  await page.goto('/account')
  await expect(page.getByRole('heading', { level: 1, name: 'Workspace sign-in' })).toBeVisible()
})

test('rechecks a protected document restored after its tab session ended', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The pageshow session contract is shared.')
  for (const path of ['/account', '/users?q=soohyun']) {
    await page.goto(path)
    await signIn(page)
    await expect(
      page.getByRole('main').getByText('admin@example.com', { exact: true }),
    ).toBeVisible()
    // Playwright disables Chromium BFCache by default. Deliver its persisted pageshow event
    // to the still-mounted document after the same tab's other document has signed out.
    await page.evaluate(() => {
      sessionStorage.removeItem('blueprint.demo.session.v1')
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    await expect(page.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
    await expect(page.getByRole('main').getByText('soohyun chae', { exact: true })).toHaveCount(0)
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
    await expect(toolbar.locator('[data-header-account="true"]')).toHaveCount(signedIn ? 1 : 0)
    if (signedIn) {
      const account = toolbar.getByRole('button', { name: 'Account menu', exact: true })
      await expect(account).toHaveAttribute('data-header-account', 'true')
      await expect(account).toHaveAttribute('data-variant', 'ghost')
      await expect(account).toHaveAttribute('data-size', 'icon-sm')
      await expectLoadedAvatar(account.locator('[data-slot="avatar"]'), ownerAvatar)
      const nickname = account.locator('[data-slot="account-nickname"]')
      await expect(nickname).toHaveText('soohyun')
      if (await page.evaluate(() => matchMedia('(min-width: 80rem)').matches)) {
        await expect(nickname).toBeVisible()
      } else {
        await expect(nickname).toBeHidden()
        await expect(account).toHaveText('', { useInnerText: true })
      }
    } else {
      await expect(toolbar.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
    }

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
          const relativeBox = (element: Element) => {
            const rect = element.getBoundingClientRect()
            return {
              width: rect.width,
              height: rect.height,
              xOffset: rect.left + rect.width / 2 - (box.left + box.width / 2),
              yOffset: rect.top + rect.height / 2 - (box.top + box.height / 2),
            }
          }
          const icons = [...action.querySelectorAll('svg')]
            .filter((svg) => svg.checkVisibility())
            .map(relativeBox)
          const account = action.getAttribute('data-header-account') === 'true'
          const avatar = action.querySelector('[data-slot="avatar"]')
          const desktop = matchMedia('(min-width: 80rem)').matches
          return {
            name: action.getAttribute('aria-label') ?? action.textContent?.trim(),
            expandedSearch: action.getAttribute('data-header-search') === 'true' && desktop,
            expandedAccount: account && desktop,
            account,
            avatar: avatar ? relativeBox(avatar) : null,
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
      if (action.expandedSearch || action.expandedAccount)
        expect(action.width, label).toBeGreaterThan(layout.rem * 2)
      else expect(action.width, label).toBeCloseTo(layout.rem * 2, 1)
      expect(Math.abs(action.rowOffset), label).toBeLessThanOrEqual(0.5)
      expect([action.border, action.background, action.image, action.shadow], label).toEqual([
        '0px',
        'rgba(0, 0, 0, 0)',
        'none',
        'none',
      ])
      if (action.account) {
        expect(action.icons, label).toHaveLength(0)
        if (!action.avatar) throw new Error(`Missing account avatar for ${label}`)
        expect(action.avatar.width, label).toBeCloseTo(layout.rem * 1.5, 1)
        expect(action.avatar.height, label).toBeCloseTo(layout.rem * 1.5, 1)
        expect(Math.abs(action.avatar.yOffset), label).toBeLessThanOrEqual(0.5)
        if (!action.expandedAccount)
          expect(Math.abs(action.avatar.xOffset), label).toBeLessThanOrEqual(0.5)
      } else {
        expect(action.avatar, label).toBeNull()
        expect(action.icons.length, label).toBeGreaterThan(0)
      }
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
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', level: 1 })).toBeVisible()
  await signIn(page)
  await expect(page).toHaveURL('/')
  await checkHeaderActions(page, toolbar, true)
  await page.goto('/orders')
  const account = toolbar.getByRole('button', { name: 'Account menu', exact: true })
  await toolbar.getByRole('button', { name: 'Display currency', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(account).toBeFocused()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Account menu', exact: true })
  await expect(menu.getByText('soohyun chae', { exact: true })).toBeVisible()
  await expect(menu.getByText('admin@example.com', { exact: true })).toBeVisible()
  await expect(
    page.locator('[data-slot="tooltip-content"]').filter({ hasText: 'Account menu' }),
  ).toHaveCount(0)
  await expectLoadedAvatar(menu.locator('[data-slot="avatar"]'), ownerAvatar)
  const myAccount = menu.getByRole('menuitem', { name: 'My account', exact: true })
  const settings = menu.getByRole('menuitem', { name: 'Workspace settings', exact: true })
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    const minimum = await page.evaluate(
      () => parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.75,
    )
    for (const item of await menu.getByRole('menuitem').all()) {
      expect((await item.boundingBox())?.height).toBeGreaterThanOrEqual(minimum)
    }
  }
  await expect(myAccount).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(settings).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/settings')
  await account.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(account).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(myAccount).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/account')
  await account.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('End')
  await expect(page.getByRole('menuitem', { name: 'Sign out', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', exact: true })).toBeVisible()
})

test('resolves a failed account image to initials and renders the next signed-in profile', async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Avatar loading and response identity are shared across viewports.',
  )
  let releaseImage!: () => void
  const pendingImage = new Promise<void>((resolve) => {
    releaseImage = resolve
  })
  let requested = false
  await context.route(
    (url) => url.pathname === ownerAvatar && url.search === '',
    async (route) => {
      requested = true
      await pendingImage
      await route.fulfill({
        status: 404,
        contentType: 'text/plain',
        body: 'Profile image unavailable',
      })
    },
  )
  const account = page.getByRole('button', { name: 'Account menu', exact: true })
  const avatar = account.locator('[data-slot="avatar"]')
  const menuAvatar = page.getByRole('menu').locator('[data-slot="avatar"]')
  try {
    await page.goto('/account')
    await signIn(page)
    await expect.poll(() => requested).toBe(true)
    await expect(account.locator('[data-slot="account-nickname"]')).toHaveText('soohyun')
    await expect(avatar).toHaveAttribute('data-profile-state', 'loading')
    await expect(avatar.locator('[data-slot="skeleton"]')).toBeVisible()
    await expect(avatar.locator('[data-slot="avatar-fallback"]')).toHaveCount(0)
    await account.click()
    await expect(menuAvatar.locator('[data-slot="skeleton"]')).toBeVisible()
  } finally {
    releaseImage()
  }
  await expect(menuAvatar.locator('[data-slot="avatar-fallback"]')).toHaveText('SC')
  await page.keyboard.press('Escape')
  await expect(avatar).toHaveAttribute('data-profile-state', 'fallback')
  await expect(avatar.locator('[data-slot="avatar-fallback"]')).toHaveText('SC')
  await expect(avatar.locator('[data-slot="skeleton"]')).toHaveCount(0)

  // A fresh sign-in uses a new cache, with the fetch override above the running MSW adapter.
  await account.click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Workspace sign-in', exact: true })).toBeVisible()
  const changedSrc = `${ownerAvatar}?profile=riley`
  await page.evaluate((src) => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init)
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname !== '/api/workspace-users/usr_demo' || !response.ok) return response
      const original = (await response.json()) as Record<string, unknown>
      return Response.json({
        ...original,
        name: 'Riley Park',
        givenName: 'Riley',
        familyName: 'Park',
        nickname: 'riley',
        avatarUrl: src,
      })
    }
  }, changedSrc)
  await signIn(page)
  await expect(page).toHaveURL('/')
  await expect(account.locator('[data-slot="account-nickname"]')).toHaveText('riley')
  await account.click()
  await page.getByRole('menuitem', { name: 'My account', exact: true }).click()
  await expect(page).toHaveURL('/account')
  await expect(page.getByRole('main')).toContainText('Riley Park')
  await expectLoadedAvatar(avatar, changedSrc)
})
