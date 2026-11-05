import { expect, test, type Locator, type Page } from './fixtures.js'

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
  await expect(page).toHaveURL((url) => url.searchParams.get('status') === 'Processing')
  await page.getByRole('textbox', { name: 'Search orders' }).fill('olivia@example.com')
  await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'olivia@example.com')
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Search orders' })).toHaveValue(
    'olivia@example.com',
  )
  await expect(page.getByRole('tab', { name: 'Processing', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
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
  await expect(page).toHaveURL((url) => url.pathname === '/orders' && url.search === '')
  await page.goBack()
  await expect(page.getByRole('textbox', { name: 'Search orders' })).toHaveValue('no such customer')
  await expect(page.getByText('No matching orders', { exact: true })).toBeVisible()
  // Typing replaces the current filter entry, so Back skips intermediate text values.
  await page.goBack()
  await expect(page.getByRole('textbox', { name: 'Search orders' })).toHaveValue('')
  await expect(page.getByRole('tab', { name: 'All orders', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.goForward()
  await expect(page.getByText('No matching orders', { exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByText('Showing 1–6 of 12 orders', { exact: true })).toBeVisible()
})

test('paginates and sorts orders, then opens details with keyboard focus restored', async ({
  page,
}) => {
  await page.goto('/orders')
  await page.getByRole('button', { name: 'Next orders page', exact: true }).click()
  await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')
  await page.reload()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View order ORD-1031', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next orders page', exact: true })).toBeDisabled()
  await page.getByRole('combobox', { name: 'Sort orders', exact: true }).click()
  await page.getByRole('option', { name: 'Total: high to low', exact: true }).click()
  await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  const orderTable = page.getByRole('region', { name: 'Orders table', exact: true })
  await expect(orderTable.getByRole('row').nth(1)).toContainText('ORD-1033')
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('sort') === 'highest' && !url.searchParams.has('page'),
  )
  await page.goBack()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Sort orders', exact: true })).toHaveText(
    'Newest first',
  )
  await page.goForward()
  await expect(orderTable.getByRole('row').nth(1)).toContainText('ORD-1033')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Sort orders', exact: true })).toHaveText(
    'Total: high to low',
  )
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
  await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')
  await page.reload()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Filter customers by status' }).click()
  await page.getByRole('option', { name: 'Inactive', exact: true }).click()
  await expect(page.getByText('Showing 1–4 of 4 customers', { exact: true })).toBeVisible()
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('status') === 'Inactive' && !url.searchParams.has('page'),
  )
  await page.goBack()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('combobox', { name: 'Filter customers by status' })).toHaveText(
    'Inactive',
  )
  await page.getByRole('textbox', { name: 'Search customers' }).fill('Canada')
  await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'Canada')
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toHaveValue('Canada')
  await expect(page.getByRole('combobox', { name: 'Filter customers by status' })).toHaveText(
    'Inactive',
  )
  await expect(
    page.getByRole('button', { name: 'View customer Drew Cano', exact: true }),
  ).toBeVisible()
  await page.getByRole('textbox', { name: 'Search customers' }).fill('no matching person')
  await expect(page.getByText('No matching customers', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toHaveValue('')
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toBeFocused()
  await expect(page).toHaveURL((url) => url.pathname === '/customers' && url.search === '')
  await page.goBack()
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toHaveValue(
    'no matching person',
  )
  await expect(page.getByText('No matching customers', { exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toHaveValue('')
  await page.getByRole('combobox', { name: 'Sort customers', exact: true }).click()
  await page.getByRole('option', { name: 'Spend: high to low', exact: true }).click()
  const customerTable = page.getByRole('region', { name: 'Customers table', exact: true })
  await expect(customerTable.getByRole('row').nth(1)).toContainText('Orlando Diggs')
  await expect(page).toHaveURL((url) => url.searchParams.get('sort') === 'highest')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Sort customers', exact: true })).toHaveText(
    'Spend: high to low',
  )
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

test('recovers invalid commerce URL filters and clamps pages after data loads', async ({
  page,
}) => {
  for (const route of ['orders', 'customers'] as const) {
    await page.goto(`/${route}?q=%5B%22invalid%22%5D&status=unknown&sort=unknown&page=-4`)
    await expect(page.getByRole('textbox', { name: `Search ${route}` })).toHaveValue('')
    await expect(page.getByRole('combobox', { name: `Sort ${route}`, exact: true })).toHaveText(
      'Newest first',
    )
    await expect(page.getByText(`Showing 1–6 of 12 ${route}`, { exact: true })).toBeVisible()
    if (route === 'orders') {
      await expect(page.getByRole('tab', { name: 'All orders', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    } else {
      await expect(page.getByRole('combobox', { name: 'Filter customers by status' })).toHaveText(
        'All statuses',
      )
    }
    await page.goto(`/${route}?page=999`)
    await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
    await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')
    await page.getByRole('button', { name: `Previous ${route} page`, exact: true }).click()
    await expect(page).toHaveURL((url) => !url.searchParams.has('page'))
  }
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
    const table = region
    await expect(table).toBeVisible()
    await expect(table).toHaveAttribute('data-slot', 'table-container')
    await expect(table).toHaveAttribute('tabindex', '0')
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
      await expect(table.getByRole('columnheader')).toHaveCount(13)
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
          // Send native touch input explicitly: the aggregate synthetic gesture can be a no-op
          // in Linux headless Chromium. Ease out the finger movement to avoid release momentum.
          const swipe = async (startX: number, distance: number) => {
            const touchPoints = (progress: number) => [
              {
                x: startX + distance * (1 - (1 - progress) ** 3),
                y: box.y + 100,
                id: 1,
              },
            ]
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: touchPoints(0),
            })
            try {
              for (let step = 1; step <= 12; step += 1) {
                await session.send('Input.dispatchTouchEvent', {
                  type: 'touchMove',
                  touchPoints: touchPoints(step / 12),
                })
                await page.evaluate(
                  () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
                )
              }
            } finally {
              await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
            }
          }
          await swipe(box.x + box.width * 0.8, -Math.min(220, box.width * 0.6))
          await expect
            .poll(() => table.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(before + 30)
          const afterSwipe = await table.evaluate((element) => element.scrollLeft)
          await swipe(box.x + box.width * 0.45, Math.min(180, box.width * 0.4))
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
        const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
        if (new URL(url, window.location.origin).pathname === path && method === 'GET') {
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

async function expectCommerceMetric(page: Page, label: string, value: string) {
  const card = page.locator('[data-metric-card]').filter({
    has: page.getByText(label, { exact: true }),
  })
  await expect(card.locator('[data-slot="metric-value"] .sr-only')).toHaveText(value)
}

async function expectEditorDateLayout(dialog: Locator, dateLabel: string, textLabel: string) {
  const date = dialog.getByLabel(dateLabel, { exact: true })
  const text = dialog.getByLabel(textLabel, { exact: true })
  await expect(date).toBeVisible()
  await expect(date).toHaveAttribute('type', 'date')
  await expect(date).toBeEditable()
  // Chromium checks geometry but does not reproduce iOS's native date sizing override.
  // Keep the computed WebKit compatibility reset covered without testing class strings.
  await expect(date).toHaveCSS('appearance', 'none')
  await expect(date).toHaveCSS('box-sizing', 'border-box')
  const dateId = await date.getAttribute('id')
  const textId = await text.getAttribute('id')
  if (!dateId || !textId) throw new Error('The editor fields need associated labels.')

  const expectLayout = async () => {
    await expect(async () => {
      const layout = await dialog.evaluate(
        (element, ids) => {
          const dateInput = element.querySelector<HTMLInputElement>(`#${CSS.escape(ids.dateId)}`)
          const textInput = element.querySelector<HTMLInputElement>(`#${CSS.escape(ids.textId)}`)
          if (!dateInput || !textInput) throw new Error('The editor fields are missing.')
          const ancestors = new Set<HTMLElement>()
          const inputs = Array.from(
            element.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
          )
          for (const input of inputs) {
            for (let parent = input.parentElement; parent; parent = parent.parentElement) {
              ancestors.add(parent)
              if (parent === element) break
            }
          }
          const scrollBody = Array.from(ancestors).find(
            (parent) =>
              parent.contains(dateInput) &&
              /^(auto|scroll)$/.test(getComputedStyle(parent).overflowY),
          )
          if (!scrollBody) throw new Error('The editor has no vertically scrollable body.')
          const bodyBox = scrollBody.getBoundingClientRect()
          const bodyStyle = getComputedStyle(scrollBody)
          const left = bodyBox.left + scrollBody.clientLeft + parseFloat(bodyStyle.paddingLeft)
          const right =
            bodyBox.left +
            scrollBody.clientLeft +
            scrollBody.clientWidth -
            parseFloat(bodyStyle.paddingRight)
          const dateBox = dateInput.getBoundingClientRect()
          const textBox = textInput.getBoundingClientRect()
          return {
            heightDifference: Math.abs(dateBox.height - textBox.height),
            widthDifference: Math.abs(dateBox.width - textBox.width),
            leftDifference: Math.abs(dateBox.left - textBox.left),
            // Include the form, field wrappers and clipped ancestors, so overflow-hidden
            // cannot turn an oversized input into an apparently passing modal.
            overflowingAncestors: Array.from(ancestors)
              .filter((parent) => parent.scrollWidth > parent.clientWidth)
              .map((parent) => ({
                tag: parent.tagName,
                width: parent.clientWidth,
                scrollWidth: parent.scrollWidth,
              })),
            outOfBoundsInputs: inputs
              .map((input) => ({
                id: input.id,
                left: input.getBoundingClientRect().left,
                right: input.getBoundingClientRect().right,
              }))
              .filter((input) => input.left < left - 1 || input.right > right + 1),
          }
        },
        { dateId, textId },
      )
      expect(
        layout.heightDifference,
        `${dateLabel} height matches ${textLabel}`,
      ).toBeLessThanOrEqual(1)
      expect(layout.widthDifference, `${dateLabel} width matches ${textLabel}`).toBeLessThanOrEqual(
        1,
      )
      expect(layout.leftDifference, `${dateLabel} aligns with ${textLabel}`).toBeLessThanOrEqual(1)
      expect(layout.overflowingAncestors, 'Editor ancestors have no horizontal overflow').toEqual(
        [],
      )
      expect(layout.outOfBoundsInputs, 'Inputs stay inside the scroll body padding').toEqual([])
    }).toPass()
  }

  const originalValue = await date.inputValue()
  expect(originalValue).not.toBe('')
  await date.fill('')
  try {
    await expect(date).toHaveValue('')
    await expectLayout()
  } finally {
    await date.fill(originalValue)
  }
  await expect(date).toHaveValue(originalValue)
  await expectLayout()
}

async function fillCustomerForm(dialog: Locator, name: string) {
  await dialog.getByLabel('Name', { exact: true }).fill(name)
  await dialog.getByLabel('Email', { exact: true }).fill('commerce.customer@example.com')
  await dialog.getByLabel('City', { exact: true }).fill('Seoul')
  await dialog.getByLabel('Country', { exact: true }).fill('South Korea')
  // A backdated record is deliberately outside the first page in the default sort.
  await dialog.getByLabel('Joined', { exact: true }).fill('2026-01-01')
}

test('creates, edits and deletes an order with protected drafts and persisted totals', async ({
  page,
}, testInfo) => {
  await page.goto('/orders?q=olivia&status=Processing&sort=highest')
  await expectCommerceMetric(page, 'Total orders', '12')
  const trigger = page.getByRole('button', { name: 'New order', exact: true })
  const originalViewport = page.viewportSize()
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 390, height: 360 })
  }
  await trigger.click()
  const editor = page.getByRole('dialog', { name: 'Create order', exact: true })
  const customerName = editor.getByLabel('Customer name', { exact: true })
  if (testInfo.project.name === 'mobile') {
    await expect(customerName).toBeFocused()
    await expect(customerName).toBeInViewport({ ratio: 1 })
    const close = editor.getByRole('button', { name: 'Close', exact: true })
    for (let step = 0; step < 24; step += 1) {
      await page.keyboard.press('Tab')
      if (await close.evaluate((element) => element === document.activeElement)) break
    }
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(customerName).toBeFocused()
    await expect(customerName).toBeInViewport({ ratio: 1 })
    await page.keyboard.press('Shift+Tab')
    await expect(close).toBeFocused()
    await expect(close).toBeInViewport({ ratio: 1 })
    if (originalViewport) await page.setViewportSize(originalViewport)
  }
  // Customer name occupies the same grid column as Order date at every viewport.
  await expectEditorDateLayout(editor, 'Order date', 'Customer name')
  await customerName.fill('Commerce order buyer')
  await page.keyboard.press('Escape')
  const discard = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
  await discard.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(customerName).toHaveValue('Commerce order buyer')
  await expect(customerName).toBeFocused()
  await editor.getByLabel('Customer email', { exact: true }).fill('commerce.order@example.com')
  await editor.getByLabel('Order date', { exact: true }).fill('2026-01-01')
  await editor.getByLabel('City', { exact: true }).fill('Seoul')
  await editor.getByLabel('Country', { exact: true }).fill('South Korea')
  await editor.getByLabel('Shipping (USD)', { exact: true }).fill('0.29')
  await editor.getByLabel('Item name', { exact: true }).fill('Precision notebook')
  await editor.getByLabel('Quantity', { exact: true }).fill('3')
  await editor.getByLabel('Unit price (USD)', { exact: true }).fill('10.25')
  await editor.getByRole('button', { name: 'Add item', exact: true }).click()
  await editor.getByLabel('Item name', { exact: true }).nth(1).fill('Small envelope')
  await editor.getByLabel('Quantity', { exact: true }).nth(1).fill('2')
  await editor.getByLabel('Unit price (USD)', { exact: true }).nth(1).fill('0.10')
  await editor.getByRole('heading', { name: 'Create order', exact: true }).scrollIntoViewIfNeeded()
  await testInfo.attach('populated-order-editor', {
    body: await editor.screenshot(),
    contentType: 'image/png',
  })
  const createdResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST',
  )
  await editor.getByRole('button', { name: 'Create order', exact: true }).click()
  const created = (await (await createdResponse).json()) as { id: string }
  await expect(editor).toBeHidden()
  const details = page.getByRole('dialog', { name: `Order ${created.id}`, exact: true })
  await expect(details.getByText('Precision notebook', { exact: true })).toBeVisible()
  await expect(details.getByText('$31.24', { exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(trigger).toBeFocused()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('q') === 'olivia' &&
      url.searchParams.get('status') === 'Processing' &&
      url.searchParams.get('sort') === 'highest',
  )
  await expectCommerceMetric(page, 'Total orders', '13')
  await expectCommerceMetric(page, 'Processing', '4')

  const search = page.getByRole('textbox', { name: 'Search orders', exact: true })
  await search.fill('commerce.order@example.com')
  await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'commerce.order@example.com')
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: created.id })
  await expect(row).toContainText('Commerce order buyer')
  const actions = page.getByRole('button', { name: `Actions for ${created.id}`, exact: true })
  await actions.click()
  await page.getByRole('menuitem', { name: 'Edit order', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit order', exact: true })
  await expectEditorDateLayout(edit, 'Order date', 'Customer name')
  await expect(edit.getByLabel('Shipping (USD)', { exact: true })).toHaveValue('0.29')
  await edit.getByLabel('Quantity', { exact: true }).first().fill('4')
  await edit.getByLabel('Order status', { exact: true }).click()
  await page.getByRole('option', { name: 'Shipped', exact: true }).click()
  await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(edit).toBeHidden()
  await expect(row).toHaveCount(0)
  await expect(search).toBeFocused()
  await expectCommerceMetric(page, 'Processing', '3')
  await expectCommerceMetric(page, 'Shipped', '3')
  await page.getByRole('tab', { name: 'Shipped', exact: true }).click()
  await expect(page).toHaveURL((url) => url.searchParams.get('status') === 'Shipped')
  await page.reload()
  await page.getByRole('button', { name: `View order ${created.id}`, exact: true }).click()
  await expect(details.getByText('$41.49', { exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Close', exact: true }).click()
  await actions.focus()
  await page.keyboard.press('ArrowDown')
  await page.getByRole('menuitem', { name: 'Delete order', exact: true }).click()
  const remove = page.getByRole('alertdialog', { name: 'Delete order?', exact: true })
  await remove.getByRole('button', { name: 'Keep order', exact: true }).click()
  await expect(actions).toBeFocused()
  await actions.click()
  await page.getByRole('menuitem', { name: 'Delete order', exact: true }).click()
  await remove.getByRole('button', { name: 'Delete order', exact: true }).click()
  await expect(remove).toBeHidden()
  await expect(search).toBeFocused()
  await expectCommerceMetric(page, 'Total orders', '12')
  await page.reload()
  await expect(page.getByText('No matching orders', { exact: true })).toBeVisible()
  await expectCommerceMetric(page, 'Shipped', '2')
})

test('retains failed customer input and persists CRUD while clamping the final page', async ({
  page,
}, testInfo) => {
  const updatedName = `Commerce customer ${'A'.repeat(62)}`
  await page.goto('/customers?q=olivia&status=Active&sort=name')
  await expectCommerceMetric(page, 'Total customers', '12')
  const trigger = page.getByRole('button', { name: 'New customer', exact: true })
  await trigger.click()
  const editor = page.getByRole('dialog', { name: 'Create customer', exact: true })
  await editor.getByLabel('Name', { exact: true }).fill('Discarded customer')
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  const discard = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
  await discard.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('')
  await expectEditorDateLayout(editor, 'Joined', 'Name')
  if (testInfo.project.name === 'mobile') {
    const originalViewport = page.viewportSize()
    await page.setViewportSize({ width: 412, height: 844 })
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    const create = editor.getByRole('button', { name: 'Create customer', exact: true })
    await create.click()
    await expect(editor.getByLabel('Name', { exact: true })).toBeFocused()
    await expectEditorDateLayout(editor, 'Joined', 'Name')
    await create.scrollIntoViewIfNeeded()
    await expect(create).toBeInViewport({ ratio: 1 })
    await expect
      .poll(() => create.evaluate((element) => element.scrollWidth - element.clientWidth))
      .toBeLessThanOrEqual(1)
    const cancel = editor.getByRole('button', { name: 'Cancel', exact: true })
    await cancel.scrollIntoViewIfNeeded()
    await expect(cancel).toBeInViewport({ ratio: 1 })
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
    if (originalViewport) await page.setViewportSize(originalViewport)
  }
  await fillCustomerForm(editor, 'Commerce customer')
  await editor
    .getByRole('heading', { name: 'Create customer', exact: true })
    .scrollIntoViewIfNeeded()
  await testInfo.attach('populated-customer-editor', {
    body: await editor.screenshot(),
    contentType: 'image/png',
  })

  const restoreFetch = await page.evaluateHandle(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
      if (new URL(url, window.location.origin).pathname === '/api/customers' && method === 'POST') {
        return Promise.resolve(new Response(null, { status: 400 }))
      }
      return originalFetch(input, init)
    }
    return () => {
      window.fetch = originalFetch
    }
  })
  await editor.getByRole('button', { name: 'Create customer', exact: true }).click()
  await expect(editor.getByRole('alert')).toHaveText(
    'The request could not be completed. Please try again.',
  )
  await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Commerce customer')
  await expect(editor.getByLabel('Joined', { exact: true })).toHaveValue('2026-01-01')
  await expectCommerceMetric(page, 'Total customers', '12')
  await restoreFetch.evaluate((restore) => {
    restore()
  })
  await restoreFetch.dispose()
  await editor.getByRole('button', { name: 'Create customer', exact: true }).click()
  await expect(editor).toBeHidden()
  const details = page.getByRole('dialog', { name: 'Commerce customer', exact: true })
  await expect(details.getByText('commerce.customer@example.com', { exact: true })).toBeVisible()
  await expect(details.locator('[data-number-state] .sr-only')).toHaveText(['0', '$0.00'])
  await details.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(trigger).toBeFocused()
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('q') === 'olivia' &&
      url.searchParams.get('status') === 'Active' &&
      url.searchParams.get('sort') === 'name',
  )
  await expectCommerceMetric(page, 'Total customers', '13')
  await expectCommerceMetric(page, 'Active customers', '9')
  const search = page.getByRole('textbox', { name: 'Search customers', exact: true })
  await search.fill('Commerce customer')
  await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'Commerce customer')
  await page.reload()
  await page.getByRole('button', { name: 'Actions for Commerce customer', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Edit customer', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit customer', exact: true })
  await expectEditorDateLayout(edit, 'Joined', 'Name')
  await edit.getByLabel('Name', { exact: true }).fill(updatedName)
  await edit.getByLabel('Status', { exact: true }).click()
  await page.getByRole('option', { name: 'Inactive', exact: true }).click()
  await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(edit).toBeHidden()
  await expect(search).toBeFocused()
  await expect(page.getByText('No matching customers', { exact: true })).toBeVisible()
  await expectCommerceMetric(page, 'Active customers', '8')
  await page.getByRole('combobox', { name: 'Filter customers by status', exact: true }).click()
  await page.getByRole('option', { name: 'All statuses', exact: true }).click()
  await expect(page).toHaveURL((url) => !url.searchParams.has('status'))
  await page.reload()
  const updated = page.getByRole('button', {
    name: `View customer ${updatedName}`,
    exact: true,
  })
  await updated.click()
  const updatedDetails = page.getByRole('dialog', {
    name: updatedName,
    exact: true,
  })
  await expect(updatedDetails.getByText('Inactive', { exact: true })).toBeVisible()
  await expect(updatedDetails.locator('[data-number-state] .sr-only')).toHaveText(['0', '$0.00'])
  await expect(updatedDetails.getByText('No orders yet', { exact: true })).toBeVisible()
  await expect(updatedDetails.getByText('No purchase history', { exact: true })).toBeVisible()
  await updatedDetails.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.getByRole('button', { name: 'Next customers page', exact: true }).click()
  await page.getByRole('button', { name: 'Next customers page', exact: true }).click()
  await expect(page.getByText('Page 3 of 3', { exact: true })).toBeVisible()
  await expect(updated).toBeVisible()
  await page.getByRole('button', { name: `Actions for ${updatedName}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete customer', exact: true }).click()
  const remove = page.getByRole('alertdialog', { name: 'Delete customer?', exact: true })
  await expect(remove).toBeInViewport({ ratio: 1 })
  await expect
    .poll(() => remove.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1)
  await expect(remove.getByRole('button', { name: 'Keep customer' })).toBeInViewport({ ratio: 1 })
  await expect(remove.getByRole('button', { name: 'Delete customer' })).toBeInViewport({ ratio: 1 })
  await remove.getByRole('button', { name: 'Delete customer', exact: true }).click()
  await expect(remove).toBeHidden()
  await expect(search).toBeFocused()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')
  await expectCommerceMetric(page, 'Total customers', '12')
  await page.reload()
  await search.fill('Commerce customer')
  await expect(page.getByText('No matching customers', { exact: true })).toBeVisible()
})

test('reconciles a committed customer with a lost response without resending the draft', async ({
  page,
}) => {
  await page.goto('/customers')
  await expectCommerceMetric(page, 'Total customers', '12')
  await page.getByRole('button', { name: 'New customer', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Create customer', exact: true })
  await fillCustomerForm(editor, 'Lost response customer')
  const traffic = await page.evaluateHandle(() => {
    const originalFetch = window.fetch.bind(window)
    let writes = 0
    let reads = 0
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
      if (new URL(url, window.location.origin).pathname === '/api/customers') {
        if (method === 'GET') reads += 1
        if (method === 'POST') {
          writes += 1
          // Let the real demo HTTP handler commit, then lose only its response.
          await originalFetch(input, init)
          throw new TypeError('Connection lost after commit')
        }
      }
      return originalFetch(input, init)
    }
    return {
      counts: () => ({ writes, reads }),
      restore: () => {
        window.fetch = originalFetch
      },
    }
  })
  await editor.getByRole('button', { name: 'Create customer', exact: true }).click()
  await expect(editor.locator('button[type="submit"]')).toBeDisabled()
  await page.keyboard.press('Enter')
  await expect(editor.getByRole('alert')).toContainText('Your changes may have been saved.')
  await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Lost response customer')
  await expect(editor.getByLabel('Email', { exact: true })).toHaveValue(
    'commerce.customer@example.com',
  )
  await expectCommerceMetric(page, 'Total customers', '13')
  const counts = await traffic.evaluate((state) => state.counts())
  expect(counts.writes).toBe(1)
  expect(counts.reads).toBeGreaterThanOrEqual(1)
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  const discard = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
  await discard.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(editor).toBeHidden()
  await traffic.evaluate((state) => {
    state.restore()
  })
  await traffic.dispose()
  const search = page.getByRole('textbox', { name: 'Search customers', exact: true })
  await search.fill('Lost response customer')
  const saved = page.getByRole('button', {
    name: 'View customer Lost response customer',
    exact: true,
  })
  await expect(saved).toHaveCount(1)
  await page.reload()
  await expect(saved).toBeVisible()
  await expectCommerceMetric(page, 'Total customers', '13')
})

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
