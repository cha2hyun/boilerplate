import { expect, test, type Page } from '@playwright/test'

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
  const visitors = page.locator(
    '[data-slot="card"][aria-label="Visitors"] [data-slot="card-title"]',
  )
  const sources = page.getByRole('table', { name: 'Traffic sources', exact: true })
  const topPages = page.getByRole('table', { name: 'Top pages', exact: true })
  const initialVisitors = await visitors.innerText()
  const initialSource = await sources.getByRole('row').nth(1).innerText()
  const initialTopPage = await topPages.getByRole('row').nth(1).innerText()

  await page.getByRole('combobox', { name: 'Analytics period' }).click()
  await page.getByRole('option', { name: 'Last 7 days', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Oct 28 – Nov 3, 2026')
  await expect(visitors).not.toHaveText(initialVisitors)
  await expect(sources.getByRole('row').nth(1)).not.toHaveText(initialSource, {
    useInnerText: true,
  })
  await expect(topPages.getByRole('row').nth(1)).not.toHaveText(initialTopPage, {
    useInnerText: true,
  })
  await expect(page.getByText('Visitors and sessions over the selected 7 days.')).toBeVisible()

  await page.getByRole('combobox', { name: 'Analytics period' }).click()
  await page.getByRole('option', { name: 'Last 30 days', exact: true }).click()
  await expect(visitors).toHaveText(initialVisitors)
  await expect(sources.getByRole('row').nth(1)).toHaveText(initialSource, { useInnerText: true })
  await expect(topPages.getByRole('row').nth(1)).toHaveText(initialTopPage, { useInnerText: true })
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

  await page.getByRole('tab', { name: 'Archived', exact: true }).click()
  await page.getByRole('button', { name: launchMessageName, exact: true }).click()
  await page.getByRole('button', { name: 'Move to inbox', exact: true }).click()
  await expect(page.getByRole('button', { name: launchMessageName, exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'All', exact: true }).click()
  await expect(page.getByRole('button', { name: launchMessageName, exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('moved to inbox')
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
  await expectNoPageOverflow(page)
})
