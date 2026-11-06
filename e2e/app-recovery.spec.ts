import { expect, test } from './fixtures.js'

test('recovers an unavailable route chunk through the reload action and restores its detail URL', async ({
  page,
  context,
  pageErrors,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Route chunk recovery is viewport independent.')
  pageErrors.allow(
    /^Failed to fetch dynamically imported module: http:\/\/127\.0\.0\.1:4173\/assets\/orders-[\w-]+\.js$/,
    2,
  )
  const isOrdersChunk = (url: URL) => /^\/assets\/orders-[^/]+\.js$/.test(url.pathname)
  const failedChunks = new Set<string>()
  let unavailable = true
  await context.route(isOrdersChunk, async (route) => {
    if (unavailable) {
      failedChunks.add(route.request().url())
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  // Keep the real chunk unavailable through the router's own one-time reload.
  await page.goto('/orders?detail=ORD-1042')
  const error = page.getByText('Something went wrong', { exact: true })
  await expect(error).toBeVisible()
  expect(failedChunks.size).toBe(1)
  await expect(page.locator('body')).not.toContainText(
    'Failed to fetch dynamically imported module',
  )
  const reload = page.getByRole('button', { name: 'Reload page', exact: true })
  await expect(reload).toBeVisible()

  unavailable = false
  const recoveredChunk = page.waitForResponse(
    (response) => isOrdersChunk(new URL(response.url())) && response.ok(),
  )
  // Exercise the offered recovery action: a test-side reload would hide a broken retry button.
  await reload.click()
  expect(await (await recoveredChunk).finished()).toBeNull()
  await expect(page).toHaveTitle('Orders · Blueprint')
  await expect(page).toHaveURL(
    (url) => url.pathname === '/orders' && url.searchParams.get('detail') === 'ORD-1042',
  )
  await expect(
    page
      .getByRole('dialog', { name: 'Order ORD-1042', exact: true })
      .getByText('olivia@example.com', {
        exact: true,
      }),
  ).toBeVisible()
  await expect(error).toBeHidden()
})

test('recovers a provider render failure without exposing error details', async ({
  page,
  pageErrors,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The root error boundary is viewport independent.')
  pageErrors.allow('private@example.test?token=do-not-display')
  await page.addInitScript(() => {
    const marker = 'e2e.provider-failure-injected'
    if (sessionStorage.getItem(marker)) return
    sessionStorage.setItem(marker, '1')
    window.matchMedia = () => {
      throw new Error('private@example.test?token=do-not-display')
    }
  })
  await page.goto('/')
  await expect(page.getByText('Unable to display this screen', { exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('private@example.test')
  await expect(page.locator('body')).not.toContainText('do-not-display')
  const reload = page.getByRole('button', { name: 'Reload page', exact: true })
  await expect(reload).toBeVisible()
  await reload.click()
  await expect(page.getByRole('heading', { name: 'Overview', level: 1, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Search workspace', exact: true })).toBeVisible()
})
