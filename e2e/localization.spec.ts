import { exchangeRateResponse, exchangeRateUrl, expect, test, type Page } from './fixtures.js'

function revenueValue(page: Page, label: string) {
  return page.locator(`[data-slot="card"][aria-label="${label}"] [data-number-state] > .sr-only`)
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
}) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
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

  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page.getByRole('menuitemradio', { name: '한국어', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR')
  await expect(page).toHaveTitle('개요 · Blueprint')
  await expect(
    page.getByRole('heading', { name: '더 선명한 오늘, 더 넓은 가능성.', exact: true }),
  ).toBeVisible()
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
  expect(exchangeRateMock.requests).toBe(1)

  await page.getByRole('link', { name: '전체 프로젝트 보기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '프로젝트', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '워크스페이스 검색', exact: true }).click()
  const search = page.getByRole('dialog', { name: '워크스페이스 검색', exact: true })
  await search.getByPlaceholder('어떤 페이지로 이동할까요?').fill('개요')
  await search.getByRole('option', { name: '개요' }).click()
  await expect(page).toHaveURL('/')
  await expect(revenueValue(page, '총매출')).toHaveText('₩41,350,500')
  expect(exchangeRateMock.requests).toBe(1)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR')
  await expect(page).toHaveTitle('개요 · Blueprint')
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
