import { expect, test } from './fixtures.js'

test('recovers a provider render failure without exposing error details', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The root error boundary is viewport independent.')
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
