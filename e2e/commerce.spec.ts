import { expect, test, type Page } from './fixtures.js'

// The browser suite consumes HTTP payloads, independently of Vite's application module graph.
type CommerceRecord =
  | { id: string; customer: { name: string; email: string } }
  | { id: string; name: string; email: string }

async function recoverInitialRead(page: Page, route: 'orders' | 'customers') {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  // Override this first read after the real demo worker starts, then restore it for retry.
  const restoreFetch = await page.evaluateHandle((endpoint) => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      if (new URL(url, window.location.origin).pathname === endpoint) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'The read is unavailable.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      return originalFetch(input, init)
    }
    return () => {
      window.fetch = originalFetch
    }
  }, `/api/${route}`)
  const title = route === 'orders' ? 'Orders' : 'Customers'
  if ((page.viewportSize()?.width ?? 1440) < 768) {
    await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click()
  }
  await page.getByRole('link', { name: title, exact: true }).click()
  const error = page.getByRole('alert').filter({ hasText: `${title} couldn’t load` })
  await expect(error).toBeVisible()
  await expect(page.getByText(`0 ${route}`, { exact: true })).toHaveCount(0)
  await expect(
    page.locator('[aria-live="polite"]').filter({ hasText: `${title} couldn’t load` }),
  ).toHaveCount(0)
  await restoreFetch.evaluate((restore) => {
    restore()
  })
  await restoreFetch.dispose()
  await error.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(error).toBeHidden()
  await expect(page.getByText(`Showing 1–6 of 12 ${route}`, { exact: true })).toBeVisible()
}

test('combines order status and customer search, and recovers from empty results', async ({
  page,
}) => {
  await recoverInitialRead(page, 'orders')
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
  await recoverInitialRead(page, 'customers')
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
  await expect(
    details.locator('[data-number-state] .sr-only').filter({ hasText: '$2,416.00' }),
  ).toHaveText('$2,416.00')
  await expect(details.getByText('San Francisco, United States', { exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(details).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('keeps commerce tables and detail sheets inside the viewport', async ({ page }, testInfo) => {
  for (const route of ['orders', 'customers'] as const) {
    if (route === 'customers' && (page.viewportSize()?.width ?? 1440) < 768) {
      await page.setViewportSize({ width: 320, height: 915 })
    }
    await page.goto(`/${route}`)
    const title = route === 'orders' ? 'Orders' : 'Customers'
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    const region = page.getByRole('region', { name: `${title} table`, exact: true })
    const table = route === 'orders' ? region : region.locator('[data-slot="table-container"]')
    await expect(table).toBeVisible()
    await expect(region).toHaveAttribute('aria-busy', 'false')
    const layout = await table.evaluate((element) => ({
      viewport: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      containerWidth: element.clientWidth,
      contentWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
    }))
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport)
    expect(layout.overflowX).toBe('auto')
    if (route === 'orders' || layout.viewport < 768) {
      expect(layout.contentWidth).toBeGreaterThan(layout.containerWidth)
    }
    if (route === 'orders') {
      await expect(table.getByRole('columnheader')).toHaveCount(12)
      for (const name of ['Products', 'Quantity', 'City', 'Country', 'Subtotal', 'Shipping']) {
        await expect(table.getByRole('columnheader', { name, exact: true })).toBeVisible()
      }
      await expect(table).toHaveAccessibleDescription(
        'Swipe or scroll horizontally to see all fields.',
      )
      await table.focus()
      await page.keyboard.press('ArrowRight')
      await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)

      if (testInfo.project.use.hasTouch) {
        await table.scrollIntoViewIfNeeded()
        const box = await table.boundingBox()
        if (!box) throw new Error('The order scroll region is missing.')
        const before = await table.evaluate((element) => element.scrollLeft)
        const session = await page.context().newCDPSession(page)
        try {
          // Real browser touch input, not DOM dispatchEvent or a direct scrollLeft assignment.
          await session.send('Input.synthesizeScrollGesture', {
            x: box.x + box.width * 0.8,
            y: box.y + 100,
            xDistance: -Math.min(220, box.width * 0.6),
            yDistance: 0,
            gestureSourceType: 'touch',
            preventFling: true,
            speed: 600,
          })
          await expect
            .poll(() => table.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(before + 30)
          const afterSwipe = await table.evaluate((element) => element.scrollLeft)
          await session.send('Input.synthesizeScrollGesture', {
            x: box.x + box.width * 0.45,
            y: box.y + 100,
            xDistance: Math.min(180, box.width * 0.4),
            yDistance: 0,
            gestureSourceType: 'touch',
            preventFling: true,
            speed: 600,
          })
          await expect
            .poll(() => table.evaluate((element) => element.scrollLeft))
            .toBeLessThan(afterSwipe - 30)
          await expect(page.getByRole('dialog')).toHaveCount(0)
        } finally {
          await session.detach()
        }
      }
      const total = table.getByRole('columnheader', { name: 'Total', exact: true })
      await total.scrollIntoViewIfNeeded()
      const rightEdge = await total.evaluate((element) => {
        const viewport = element.closest('[data-slot="table-container"]')
        if (!viewport) throw new Error('The header has no scroll container.')
        return {
          right: element.getBoundingClientRect().right,
          limit: viewport.getBoundingClientRect().right,
        }
      })
      expect(rightEdge.right).toBeLessThanOrEqual(rightEdge.limit + 1)
      const pinnedOrder = table.getByRole('button').first()
      const pinnedBounds = await pinnedOrder.evaluate((element) => {
        const viewport = element.closest('[data-slot="table-container"]')
        if (!viewport) throw new Error('The order has no scroll container.')
        const button = element.getBoundingClientRect()
        const container = viewport.getBoundingClientRect()
        return { left: button.left, right: button.right, min: container.left, max: container.right }
      })
      expect(pinnedBounds.left).toBeGreaterThanOrEqual(pinnedBounds.min)
      expect(pinnedBounds.right).toBeLessThanOrEqual(pinnedBounds.max)
    }
    if (route === 'customers') {
      await page.getByRole('button', { name: 'Display currency', exact: true }).click()
      await page.getByRole('menuitemradio', { name: 'Korean won (KRW)', exact: true }).click()
      await region.getByRole('button', { name: 'View customer Lana Steiner', exact: true }).click()
    } else {
      await region.getByRole('button').first().click()
    }
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(async () => {
      const box = await sheet.boundingBox()
      expect(box).not.toBeNull()
      if (!box) return
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(layout.viewport + 1)
    }).toPass()
    if (route === 'customers') {
      const amount = sheet.locator('[data-number-state]').last()
      await expect(amount.locator('.sr-only')).toHaveText('₩2,062,800')
      await expect(amount).toHaveAttribute('data-number-state', 'idle')
      const bounds = await amount.evaluate((element) => {
        const card = element.closest('[data-slot="card"]')
        if (!card) throw new Error('The customer amount has no summary card.')
        const amountBox = element.getBoundingClientRect()
        const cardBox = card.getBoundingClientRect()
        return {
          left: amountBox.left,
          right: amountBox.right,
          cardLeft: cardBox.left,
          cardRight: cardBox.right,
        }
      })
      expect(bounds.left).toBeGreaterThanOrEqual(bounds.cardLeft)
      expect(bounds.right).toBeLessThanOrEqual(bounds.cardRight)
    }
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  }
})

async function refreshCommerceResponse(
  page: Page,
  endpoint: string,
  records: unknown,
  time: number,
) {
  // Initial requests use the real demo worker. Override only this read response to model
  // server edits/deletions, without exposing a QueryClient or test hooks in application code.
  await page.evaluate(
    ({ path, data }) => {
      const originalFetch = window.fetch.bind(window)
      window.fetch = (input, init) => {
        const url = input instanceof Request ? input.url : String(input)
        if (new URL(url, window.location.origin).pathname === path) {
          return Promise.resolve(
            new Response(JSON.stringify(data), {
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        }
        return originalFetch(input, init)
      }
    },
    { path: endpoint, data: records },
  )
  await page.clock.setFixedTime(time)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
  })
}

for (const route of ['orders', 'customers'] as const) {
  test(`${route} keeps open details current and contains long customer text`, async ({ page }) => {
    const start = new Date('2026-11-04T00:00:00Z').getTime()
    const endpoint = `/api/${route}`
    await page.clock.setFixedTime(start)
    const firstResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === endpoint,
    )
    await page.goto(`/${route}`)
    const records = (await (await firstResponse).json()) as CommerceRecord[]
    const first = records[0]
    if (!first) throw new Error('The sample commerce response was empty.')
    const originalName = 'customer' in first ? first.customer.name : first.name
    const name = 'Alexandra Montgomery-Rutherford with a deliberately long customer profile name'
    const email = 'alexandra.long.customer.profile.for.account@example.com'
    const revised =
      'customer' in first
        ? { ...first, customer: { ...first.customer, name, email } }
        : { ...first, name, email }
    const revisedRecords = records.map((record) => (record.id === first.id ? revised : record))
    const originalTrigger =
      route === 'orders' ? `View order ${first.id}` : `View customer ${originalName}`
    const revisedTrigger = route === 'orders' ? `View order ${first.id}` : `View customer ${name}`
    await page.getByRole('button', { name: originalTrigger, exact: true }).click()
    const details = page.getByRole('dialog')
    await expect(details).toBeVisible()

    await refreshCommerceResponse(page, endpoint, revisedRecords, start + 61_000)
    await expect(details.getByText(name, { exact: true })).toBeVisible()
    await expect(details.getByText(email, { exact: true })).toBeVisible()
    await details.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(details).toBeHidden()

    const title = route === 'orders' ? 'Orders' : 'Customers'
    const table = page.getByRole('region', { name: `${title} table`, exact: true })
    for (const text of [name, email]) {
      const field = table.getByTitle(text, { exact: true })
      await expect(field).toHaveText(text)
      const bounds = await field.evaluate((element) => {
        const cell = element.closest('td')
        if (!cell) throw new Error('The customer field is outside its table cell.')
        const fieldBox = element.getBoundingClientRect()
        const cellBox = cell.getBoundingClientRect()
        return {
          right: fieldBox.right,
          cellRight: cellBox.right,
          clipped: element.scrollWidth > element.clientWidth,
          overflow: getComputedStyle(element).overflowX,
          ellipsis: getComputedStyle(element).textOverflow,
        }
      })
      expect(bounds.right).toBeLessThanOrEqual(bounds.cellRight)
      expect(bounds.clipped).toBe(true)
      expect(bounds.overflow).toBe('hidden')
      expect(bounds.ellipsis).toBe('ellipsis')
    }

    await page.getByRole('button', { name: revisedTrigger, exact: true }).click()
    await expect(details).toBeVisible()
    await refreshCommerceResponse(
      page,
      endpoint,
      records.filter((record) => record.id !== first.id),
      start + 122_000,
    )
    await expect(details).toBeHidden()
    await expect(page.getByRole('textbox', { name: `Search ${route}`, exact: true })).toBeFocused()

    // A later response containing the same ID must not reopen a dismissed selection.
    await refreshCommerceResponse(page, endpoint, revisedRecords, start + 183_000)
    await expect(page.getByRole('button', { name: revisedTrigger, exact: true })).toBeVisible()
    await expect(details).toBeHidden()
  })
}
