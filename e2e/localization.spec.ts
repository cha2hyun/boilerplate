import { exchangeRateResponse, exchangeRateUrl, expect, test, type Page } from './fixtures.js'

function revenueValue(page: Page, label: string) {
  return page.locator(`[data-slot="card"][aria-label="${label}"] [data-number-state] > .sr-only`)
}

async function expectResponsiveControls(page: Page, korean: boolean) {
  const language = page.getByRole('button', {
    name: korean ? '언어 선택' : 'Language',
    exact: true,
  })
  const currency = page.getByRole('switch', {
    name: korean ? '금액을 원화(KRW)로 표시' : 'Display amounts in KRW',
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
  await expect(page.locator('#exchange-rate-status')).toContainText(
    'Reference: 1 USD = ₩1,350 · Nov 3, 2026',
  )
  await expect(revenueValue(page, 'Total revenue')).toHaveText('$30,630')
  await expectResponsiveControls(page, false)

  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page.getByRole('menuitemradio', { name: '한국어', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR')
  await expect(page).toHaveTitle('개요 · Blueprint')
  await expect(
    page.getByRole('heading', { name: '더 선명한 오늘, 더 넓은 가능성.', exact: true }),
  ).toBeVisible()
  const koreanCurrency = page.getByRole('switch', {
    name: '금액을 원화(KRW)로 표시',
    exact: true,
  })
  await expect(koreanCurrency).not.toBeChecked()
  await expect(revenueValue(page, '총매출')).toHaveText('US$30,630')
  await koreanCurrency.click()
  await expect(koreanCurrency).toBeChecked()
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
  await expect(koreanCurrency).toBeChecked()
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
  const englishCurrency = page.getByRole('switch', {
    name: 'Display amounts in KRW',
    exact: true,
  })
  await expect(englishCurrency).toBeChecked()
  await expect(revenueValue(page, 'Total revenue')).toHaveText('₩41,350,500')
  await englishCurrency.click()
  await expect(englishCurrency).not.toBeChecked()
  await expect(revenueValue(page, 'Total revenue')).toHaveText('$30,630')
  await expect(
    page.getByText('The workspace invoice for $249.00 was paid.', { exact: true }),
  ).toBeVisible()
  expect(exchangeRateMock.requests).toBe(2)
  await expectResponsiveControls(page, false)
})

test('shows missing KRW amounts after a rate failure and recovers through the header retry', async ({
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
  await expect(page.locator('#exchange-rate-status')).toContainText('Exchange rate unavailable')
  expect(requests).toBe(2)
  await page.getByRole('switch', { name: 'Display amounts in KRW', exact: true }).click()
  await expect(revenueValue(page, 'Total revenue')).toHaveText('—')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')

  fail = false
  await page.getByRole('button', { name: 'Retry rate', exact: true }).click()
  await expect(page.locator('#exchange-rate-status')).toContainText(
    'Reference: 1 USD = ₩1,350 · Nov 3, 2026',
  )
  await expect(revenueValue(page, 'Total revenue')).toHaveText('₩41,350,500')
  await expect(page.getByRole('button', { name: 'Retry rate', exact: true })).toHaveCount(0)
  expect(requests).toBe(3)
  await expectResponsiveControls(page, false)
})
