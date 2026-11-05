import { expect, test } from './fixtures.js'

// A small WebKit rendering/input smoke suite, not a claim of testing an iPhone or Safari itself.
test('WebKit keeps the order date field and protected mobile dialog usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 568 })
  await page.goto('/orders')
  const trigger = page.getByRole('button', { name: 'New order', exact: true })
  await trigger.tap()
  const editor = page.getByRole('dialog', { name: 'Create order', exact: true })
  const name = editor.getByLabel('Customer name', { exact: true })
  const date = editor.getByLabel('Order date', { exact: true })
  await expect(name).toBeFocused()
  await name.fill('WebKit draft customer')
  await date.fill('2026-01-01')
  await expect(date).toHaveValue('2026-01-01')
  await date.scrollIntoViewIfNeeded()
  await expect(date).toBeInViewport({ ratio: 1 })
  const layout = await date.evaluate((element) => ({
    width: element.clientWidth,
    contentWidth: element.scrollWidth,
    pageWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.width + 1)
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport)
  const save = editor.getByRole('button', { name: 'Create order', exact: true })
  await save.scrollIntoViewIfNeeded()
  await expect(save).toBeInViewport({ ratio: 1 })

  await page.keyboard.press('Escape')
  const prompt = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
  const keep = prompt.getByRole('button', { name: 'Keep editing', exact: true })
  await expect(keep).toBeFocused()
  await keep.tap()
  await expect(prompt).toBeHidden()
  await expect(name).toBeFocused()
  await expect(name).toHaveValue('WebKit draft customer')
  await expect(date).toHaveValue('2026-01-01')
  await page.keyboard.press('Escape')
  await prompt.getByRole('button', { name: 'Discard changes', exact: true }).tap()
  await expect(editor).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('WebKit keeps mobile navigation and the order table inside the viewport', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/orders')
  const table = page.getByRole('region', { name: 'Orders table', exact: true })
  await expect(table).toHaveAttribute('aria-busy', 'false')
  await expect(table.getByRole('row')).not.toHaveCount(0)
  const layout = await table.evaluate((element) => ({
    width: element.clientWidth,
    contentWidth: element.scrollWidth,
    overflow: getComputedStyle(element).overflowX,
    pageWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(layout.overflow).toBe('auto')
  expect(layout.contentWidth).toBeGreaterThan(layout.width)
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport)
  await table.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)

  const sidebarTrigger = page.getByRole('button', { name: 'Toggle Sidebar', exact: true })
  await sidebarTrigger.tap()
  const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true })
  await expect(sidebar).toBeInViewport({ ratio: 1 })
  await sidebar.getByRole('link', { name: 'Customers', exact: true }).tap()
  await expect(page).toHaveURL('/customers')
  await expect(sidebar).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible()
  await sidebarTrigger.tap()
  await sidebar.getByRole('button', { name: 'Close', exact: true }).tap()
  await expect(sidebar).toBeHidden()
  await expect(sidebarTrigger).toBeFocused()
  expect(errors).toEqual([])
})
