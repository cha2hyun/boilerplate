import { expect, test } from '@playwright/test'

test('combines order status and customer search, and recovers from empty results', async ({
  page,
}) => {
  await page.goto('/orders')
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Processing', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Processing', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText('Showing 1–3 of 3 orders', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search orders' }).fill('olivia@example.com')
  await expect(page.getByRole('button', { name: 'View order ORD-1042', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View order ORD-1039', exact: true })).toHaveCount(
    0,
  )
  await page.getByRole('textbox', { name: 'Search orders' }).fill('no such customer')
  await expect(page.getByText('No matching orders', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search orders' })).toHaveValue('')
  await expect(page.getByRole('textbox', { name: 'Search orders' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'All orders', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText('Showing 1–6 of 12 orders', { exact: true })).toBeVisible()
})

test('paginates and sorts orders, then opens details with keyboard focus restored', async ({
  page,
}) => {
  await page.goto('/orders')
  await page.getByRole('button', { name: 'Next orders page', exact: true }).click()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View order ORD-1031', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next orders page', exact: true })).toBeDisabled()
  await page.getByRole('combobox', { name: 'Sort orders', exact: true }).click()
  await page.getByRole('option', { name: 'Total: high to low', exact: true }).click()
  await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  const orderTable = page.getByRole('region', { name: 'Orders table', exact: true })
  await expect(orderTable.getByRole('row').nth(1)).toContainText('ORD-1033')
  await page.getByRole('textbox', { name: 'Search orders' }).fill('ORD-1042')
  const trigger = page.getByRole('button', { name: 'View order ORD-1042', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const details = page.getByRole('dialog', { name: 'Order ORD-1042', exact: true })
  await expect(details).toBeVisible()
  await expect(details.getByText('Everyday backpack', { exact: true })).toBeVisible()
  await expect(details.getByText('Canvas pouch', { exact: true })).toBeVisible()
  await expect(details.getByText('$123.00', { exact: true })).toBeVisible()
  await expect(details.getByText('olivia@example.com', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('filters, sorts, paginates and inspects sample customer profiles', async ({ page }) => {
  await page.goto('/customers')
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next customers page', exact: true }).click()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Filter customers by status' }).click()
  await page.getByRole('option', { name: 'Inactive', exact: true }).click()
  await expect(page.getByText('Showing 1–4 of 4 customers', { exact: true })).toBeVisible()
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search customers' }).fill('Canada')
  await expect(
    page.getByRole('button', { name: 'View customer Drew Cano', exact: true }),
  ).toBeVisible()
  await page.getByRole('textbox', { name: 'Search customers' }).fill('no matching person')
  await expect(page.getByText('No matching customers', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toHaveValue('')
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toBeFocused()
  await page.getByRole('combobox', { name: 'Sort customers', exact: true }).click()
  await page.getByRole('option', { name: 'Spend: high to low', exact: true }).click()
  const customerTable = page.getByRole('region', { name: 'Customers table', exact: true })
  await expect(customerTable.getByRole('row').nth(1)).toContainText('Orlando Diggs')
  const trigger = page.getByRole('button', { name: 'View customer Orlando Diggs', exact: true })
  await trigger.click()
  const details = page.getByRole('dialog', { name: 'Orlando Diggs', exact: true })
  await expect(details).toBeVisible()
  await expect(details.getByText('orlando@example.com', { exact: true })).toBeVisible()
  await expect(details.getByText('$2,416.00', { exact: true })).toBeVisible()
  await expect(details.getByText('San Francisco, United States', { exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(details).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('keeps commerce tables and detail sheets inside the viewport', async ({ page }) => {
  for (const route of ['orders', 'customers'] as const) {
    await page.goto(`/${route}`)
    const title = route === 'orders' ? 'Orders' : 'Customers'
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    const region = page.getByRole('region', { name: `${title} table`, exact: true })
    const table = region.locator('[data-slot="table-container"]')
    await expect(table).toBeVisible()
    const layout = await table.evaluate((element) => ({
      viewport: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      containerWidth: element.clientWidth,
      contentWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
    }))
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport)
    expect(layout.overflowX).toBe('auto')
    if (layout.viewport < 768) expect(layout.contentWidth).toBeGreaterThan(layout.containerWidth)
    await region.getByRole('button').first().click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(async () => {
      const box = await sheet.boundingBox()
      expect(box).not.toBeNull()
      if (!box) return
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(layout.viewport + 1)
    }).toPass()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  }
})
