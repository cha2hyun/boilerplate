import { exchangeRateResponse, exchangeRateUrl, expect, test, type Page } from './fixtures.js'

function revenueValue(page: Page, label: string) {
  return page.locator(`[data-slot="card"][aria-label="${label}"] [data-number-state] > .sr-only`)
}

async function expectReadableRevenueChart(page: Page, korean: boolean) {
  const card = page.locator('[data-slot="card"]').filter({
    has: page.getByText(korean ? '매출 현황' : 'Revenue overview', { exact: true }),
  })
  const header = card.locator('[data-slot="card-header"]')
  if ((page.viewportSize()?.width ?? 0) < 640) {
    const description = await header.locator('[data-slot="card-description"]').boundingBox()
    const period = await header.getByRole('combobox').boundingBox()
    if (!description || !period) throw new Error('Revenue header controls are missing.')
    expect(period.y).toBeGreaterThanOrEqual(description.y + description.height)
    expect(Math.abs(period.x - description.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(period.width - description.width)).toBeLessThanOrEqual(1)
  }

  const chart = card.locator('svg.recharts-surface').first()
  await chart.scrollIntoViewIfNeeded()
  const bounds = await chart.boundingBox()
  if (!bounds) throw new Error('Revenue chart is missing.')
  // Escape dismisses the last Recharts point while closing the currency menu.
  // Traverse the plot as a pointer user would to select a fresh point.
  await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.5)
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.5)
  const tooltip = card.locator('[data-slot="chart-tooltip-content"]')
  await expect(tooltip).toBeVisible()
  const values = tooltip.locator('[data-slot="chart-tooltip-value"]')
  await expect(values).toHaveCount(2)
  const rows = await values.evaluateAll((elements) =>
    elements.map((value) => {
      const name = value.previousElementSibling
      if (!name) throw new Error('Tooltip value must have its series name.')
      const valueBounds = value.getBoundingClientRect()
      const nameBounds = name.getBoundingClientRect()
      return {
        gap: valueBounds.left - nameBounds.right,
        left: nameBounds.left,
        right: valueBounds.right,
      }
    }),
  )
  for (const row of rows) {
    expect(row.gap).toBeGreaterThanOrEqual(11.5)
    expect(row.left).toBeGreaterThanOrEqual(0)
    expect(row.right).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0)
  }
}

async function expectResponsiveControls(page: Page, korean: boolean) {
  const language = page.getByRole('button', {
    name: korean ? '언어 선택' : 'Language',
    exact: true,
  })
  const currency = page.getByRole('button', {
    name: korean ? '표시 통화' : 'Display currency',
    exact: true,
  })
  await expect(language).toBeVisible()
  await expect(currency).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport)
  const languageBox = await language.boundingBox()
  const currencyBox = await currency.boundingBox()
  expect(languageBox).not.toBeNull()
  expect(currencyBox).not.toBeNull()
  if (!languageBox || !currencyBox) throw new Error('The localization controls are missing.')
  expect(languageBox.x + languageBox.width).toBeLessThanOrEqual(currencyBox.x)
  expect(currencyBox.x + currencyBox.width).toBeLessThanOrEqual(dimensions.viewport)
  expect(currencyBox.width).toBe(languageBox.width)
  expect(currencyBox.height).toBe(languageBox.height)
  expect(
    Math.abs(languageBox.y + languageBox.height / 2 - currencyBox.y - currencyBox.height / 2),
  ).toBeLessThanOrEqual(1)
}

test('persists independent language and currency choices and reuses the reference rate across navigation', async ({
  page,
  exchangeRateMock,
}, testInfo) => {
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 740 })
  }
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
  await expect(page.getByRole('heading', { name: 'Overview', level: 1, exact: true })).toBeVisible()
  const englishCurrency = page.getByRole('button', { name: 'Display currency', exact: true })
  const currencyMenu = page.getByRole('menu')
  const englishUsd = page.getByRole('menuitemradio', { name: 'US dollar (USD)', exact: true })
  const englishKrw = page.getByRole('menuitemradio', { name: 'Korean won (KRW)', exact: true })
  await expect(page.locator('#exchange-rate-status')).toHaveCount(0)
  await englishCurrency.focus()
  await englishCurrency.press('ArrowDown')
  await expect(currencyMenu.locator('#exchange-rate-status')).toHaveText(
    'Reference: 1 USD = ₩1,350',
  )
  await expect(englishUsd).toHaveAttribute('aria-checked', 'true')
  await expect(englishKrw).toHaveAttribute('aria-checked', 'false')
  await page.keyboard.press('Escape')
  await expect(currencyMenu).toHaveCount(0)
  await expect(englishCurrency).toBeFocused()
  await expect(revenueValue(page, 'Total revenue')).toHaveText('$30,630')
  await expectResponsiveControls(page, false)
  await expectReadableRevenueChart(page, false)

  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page.getByRole('menuitemradio', { name: '한국어', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR')
  await expect(page).toHaveTitle('개요 · Blueprint')
  await expect(page.getByRole('heading', { name: '개요', level: 1, exact: true })).toBeVisible()
  await expect(page.getByText('워크스페이스 개요', { exact: true })).toHaveCount(0)
  const koreanCurrency = page.getByRole('button', { name: '표시 통화', exact: true })
  const koreanUsd = page.getByRole('menuitemradio', { name: '미국 달러 (USD)', exact: true })
  const koreanKrw = page.getByRole('menuitemradio', { name: '대한민국 원 (KRW)', exact: true })
  await expect(revenueValue(page, '총매출')).toHaveText('US$30,630')
  await koreanCurrency.click()
  await expect(koreanUsd).toHaveAttribute('aria-checked', 'true')
  await expect(koreanKrw).toHaveAttribute('aria-checked', 'false')
  await koreanKrw.click()
  await expect(currencyMenu).toHaveCount(0)
  await expect(page.locator('#exchange-rate-status')).toHaveCount(0)
  await koreanCurrency.click()
  await expect(koreanUsd).toHaveAttribute('aria-checked', 'false')
  await expect(koreanKrw).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(koreanCurrency).toBeFocused()
  await expect(revenueValue(page, '총매출')).toHaveText('₩41,350,500')
  await expect(
    page.getByText('워크스페이스 청구 금액 ₩336,150 결제를 완료했습니다.', { exact: true }),
  ).toBeVisible()
  await expectResponsiveControls(page, true)
  await expectReadableRevenueChart(page, true)
  expect(exchangeRateMock.requests).toBe(1)

  await page.getByRole('link', { name: '전체 프로젝트 보기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '프로젝트', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '워크스페이스 검색', exact: true }).click()
  const search = page.getByRole('dialog', { name: '워크스페이스 검색', exact: true })
  await expect(search.getByRole('listbox', { name: '추천 항목', exact: true })).toBeVisible()
  await search.getByRole('combobox', { name: '워크스페이스 검색', exact: true }).fill('개요')
  await search.getByRole('option', { name: '개요' }).click()
  await expect(page).toHaveURL('/')
  await expect(revenueValue(page, '총매출')).toHaveText('₩41,350,500')
  expect(exchangeRateMock.requests).toBe(1)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR')
  await expect(page).toHaveTitle('개요 · Blueprint')
  await expect(page.getByRole('heading', { name: '개요', level: 1, exact: true })).toBeVisible()
  await koreanCurrency.click()
  await expect(koreanUsd).toHaveAttribute('aria-checked', 'false')
  await expect(koreanKrw).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(revenueValue(page, '총매출')).toHaveText('₩41,350,500')
  expect(exchangeRateMock.requests).toBe(2)
  const savedPreferences = await page.evaluate(() =>
    localStorage.getItem('blueprint-locale-preferences'),
  )
  expect(savedPreferences).toContain('"locale":"ko-KR"')
  expect(savedPreferences).toContain('"currency":"KRW"')

  await page.getByRole('button', { name: '언어 선택', exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
  await expect(page).toHaveTitle('Overview · Blueprint')
  await expect(page.getByRole('heading', { name: 'Overview', level: 1, exact: true })).toBeVisible()
  await englishCurrency.click()
  await expect(englishUsd).toHaveAttribute('aria-checked', 'false')
  await expect(englishKrw).toHaveAttribute('aria-checked', 'true')
  await expect(revenueValue(page, 'Total revenue')).toHaveText('₩41,350,500')
  await englishUsd.click()
  await expect(currencyMenu).toHaveCount(0)
  await englishCurrency.click()
  await expect(englishUsd).toHaveAttribute('aria-checked', 'true')
  await expect(englishKrw).toHaveAttribute('aria-checked', 'false')
  await page.keyboard.press('Escape')
  await expect(revenueValue(page, 'Total revenue')).toHaveText('$30,630')
  await expect(
    page.getByText('The workspace invoice for $249.00 was paid.', { exact: true }),
  ).toBeVisible()
  expect(exchangeRateMock.requests).toBe(2)
  await expectResponsiveControls(page, false)
})

test('shows missing KRW amounts after a rate failure and recovers through the currency menu retry', async ({
  page,
  context,
}) => {
  let fail = true
  let requests = 0
  // Registered after the automatic fixture, so this scenario owns this one public URL.
  await context.route(exchangeRateUrl, async (route) => {
    requests += 1
    await route.fulfill({
      status: fail ? 503 : 200,
      json: fail ? { message: 'Reference rate temporarily unavailable' } : exchangeRateResponse,
      headers: { 'access-control-allow-origin': '*' },
    })
  })
  await page.goto('/')
  const currency = page.getByRole('button', { name: 'Display currency', exact: true })
  const currencyMenu = page.getByRole('menu')
  await expect(page.locator('#exchange-rate-status')).toHaveCount(0)
  await currency.click()
  await expect(currencyMenu.locator('#exchange-rate-status')).toContainText(
    'Exchange rate unavailable',
  )
  expect(requests).toBe(2)
  await page.getByRole('menuitemradio', { name: 'Korean won (KRW)', exact: true }).click()
  await expect(currencyMenu).toHaveCount(0)
  await expect(revenueValue(page, 'Total revenue')).toHaveText('—')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')

  fail = false
  await currency.click()
  await page.getByRole('menuitem', { name: 'Retry rate', exact: true }).click()
  await expect(currencyMenu).toBeVisible()
  await expect(currencyMenu.locator('#exchange-rate-status')).toHaveText(
    'Reference: 1 USD = ₩1,350',
  )
  await expect(revenueValue(page, 'Total revenue')).toHaveText('₩41,350,500')
  await expect(page.getByRole('menuitem', { name: 'Retry rate', exact: true })).toHaveCount(0)
  expect(requests).toBe(3)
  await page.keyboard.press('Escape')
  await expect(currencyMenu).toHaveCount(0)
  await expect(currency).toBeFocused()
  await expectResponsiveControls(page, false)
})
