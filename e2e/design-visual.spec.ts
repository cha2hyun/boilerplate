import { existsSync } from 'node:fs'
import type { TestInfo } from '@playwright/test'
import { expect, test, type Locator, type Page } from './fixtures.js'

async function compareComposition(
  locator: Locator,
  name: string,
  testInfo: TestInfo,
  maxDiffPixels: number,
) {
  // Missing baselines remain failures. Save an explicit candidate for human review;
  // Playwright's updateSnapshots:none exits before capturing a missing baseline.
  if (!existsSync(testInfo.snapshotPath(name, { kind: 'screenshot' }))) {
    const actual = testInfo.outputPath(name.replace('.png', '-actual.png'))
    await locator.screenshot({ path: actual, animations: 'disabled', caret: 'hide', scale: 'css' })
    await testInfo.attach(`Unapproved candidate: ${name}`, {
      path: actual,
      contentType: 'image/png',
    })
  }
  await expect(locator).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    maxDiffPixels,
  })
}

async function preparePage(
  page: Page,
  options: { theme: 'light' | 'dark'; locale: 'en-US' | 'ko-KR'; currency: 'USD' | 'KRW' },
) {
  await page.clock.setFixedTime(new Date('2026-11-04T00:00:00Z'))
  await page.addInitScript(({ theme, locale, currency }) => {
    localStorage.setItem('blueprint-theme', theme)
    localStorage.setItem(
      'blueprint-locale-preferences',
      JSON.stringify({ state: { locale, currency }, version: 1 }),
    )
  }, options)
}

async function ready(page: Page) {
  await expect(page.locator('#main-content h1')).toBeVisible()
  await expect(page.locator('#main-content [aria-busy="true"]')).toHaveCount(0)
  await expect(page.locator('#main-content [data-slot="skeleton"]')).toHaveCount(0)
  await expect(page.locator('#main-content [data-number-state="running"]')).toHaveCount(0)
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.mouse.move(0, 0)
}

test.describe('approved design compositions', () => {
  test.use({ reducedMotion: 'reduce', timezoneId: 'UTC', deviceScaleFactor: 1 })

  // A small representative matrix, not every page × theme × locale combination.
  test('preserves approved metrics and table compositions', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name === 'mobile'
    const tablet = testInfo.project.name === 'tablet'
    await preparePage(page, {
      theme: mobile ? 'dark' : 'light',
      locale: tablet || mobile ? 'ko-KR' : 'en-US',
      currency: tablet ? 'KRW' : 'USD',
    })
    await page.goto(tablet ? '/orders' : mobile ? '/analytics' : '/')
    await expect(page.locator('[data-metric-card]')).toHaveCount(4)
    await ready(page)
    if (tablet) {
      await expect(
        page.getByRole('row').filter({ has: page.getByRole('button', { name: /ORD-1042/ }) }),
      ).toContainText('₩166,050')
    }

    const composition = tablet
      ? page.locator('[data-slot="card"]').filter({ has: page.getByRole('table') })
      : page.locator('[data-metric-card]').first().locator('..')
    await expect(composition).toHaveCount(1)
    await compareComposition(
      composition,
      tablet ? 'orders-table.png' : 'metric-cards.png',
      testInfo,
      60,
    )
  })

  test('preserves the project form and inline validation composition', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'One form baseline supplements the three viewport compositions.',
    )
    await preparePage(page, { theme: 'dark', locale: 'en-US', currency: 'USD' })
    await page.goto('/projects')
    await ready(page)
    await page.getByRole('button', { name: 'New project', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a project', exact: true })
    await dialog.getByLabel('Project name', { exact: true }).fill('x')
    await dialog.getByRole('button', { name: 'Create project', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveText('Use at least 2 characters.')
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await page.mouse.move(0, 0)
    await compareComposition(dialog, 'project-form-error.png', testInfo, 30)
  })

  test('keeps the documented small-text token pairs readable in both themes', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Token colors are shared across viewports.')
    await preparePage(page, { theme: 'light', locale: 'en-US', currency: 'USD' })
    await page.goto('/settings')
    await ready(page)
    for (const theme of ['light', 'dark']) {
      const contrasts = await page.evaluate((theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        document.documentElement.classList.toggle('light', theme === 'light')
        const style = getComputedStyle(document.documentElement)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Canvas color conversion is unavailable')
        const rgb = (token: string) => {
          const value = style.getPropertyValue(`--${token}`).trim()
          if (!value || !CSS.supports('color', value))
            throw new Error(`Missing color token ${token}`)
          context.clearRect(0, 0, 1, 1)
          context.fillStyle = value
          context.fillRect(0, 0, 1, 1)
          const [red, green, blue, alpha] = Array.from(context.getImageData(0, 0, 1, 1).data)
          if (alpha !== 255) throw new Error(`Text token ${token} must be opaque for this check`)
          return [red!, green!, blue!]
        }
        const luminance = (channels: number[]) => {
          const linear = channels.map((value) => {
            const srgb = value / 255
            return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
        }
        return [
          ['background', 'foreground'],
          ['card', 'card-foreground'],
          ['card', 'muted-foreground'],
          ['muted', 'foreground'],
          ['popover', 'popover-foreground'],
          ['primary', 'primary-foreground'],
          ['secondary', 'secondary-foreground'],
          ['brand', 'brand-foreground'],
        ].map(([background, foreground]) => {
          const first = luminance(rgb(background!))
          const second = luminance(rgb(foreground!))
          return {
            pair: `${background}/${foreground}`,
            contrast: (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
          }
        })
      }, theme)
      for (const { pair, contrast } of contrasts) {
        expect(contrast, `${theme} ${pair} small text contrast`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test('renders readable chart axes and avatar initials in both themes', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Shared chart styles are checked once.')
    await preparePage(page, { theme: 'light', locale: 'en-US', currency: 'USD' })
    for (const route of ['/', '/analytics', '/projects']) {
      await page.goto(route)
      await ready(page)
      const ticks = page.locator(
        '[data-slot="chart"] .recharts-cartesian-axis-tick-value, [data-slot="avatar-fallback"]',
      )
      await expect(ticks.first()).toBeVisible()
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => {
          document.documentElement.classList.toggle('dark', theme === 'dark')
          document.documentElement.classList.toggle('light', theme === 'light')
        }, theme)
        const contrasts = await ticks.evaluateAll((elements) => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error('Canvas color conversion is unavailable')
          const rgb = (color: string) => {
            context.clearRect(0, 0, 1, 1)
            context.fillStyle = color
            context.fillRect(0, 0, 1, 1)
            const [red, green, blue, alpha] = Array.from(context.getImageData(0, 0, 1, 1).data)
            if (alpha !== 255) throw new Error('Chart contrast requires opaque text and surface')
            return [red!, green!, blue!]
          }
          const luminance = (channels: number[]) => {
            const linear = channels.map((channel) => {
              const value = channel / 255
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
            })
            return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
          }
          return elements
            .filter((element) => element.textContent?.trim())
            .map((element) => {
              const isAvatar = element.getAttribute('data-slot') === 'avatar-fallback'
              const intended = rgb(
                getComputedStyle(document.documentElement).getPropertyValue(
                  isAvatar ? '--foreground' : '--muted-foreground',
                ),
              )
              const surface = isAvatar ? element : element.closest('[data-slot="card"]')
              if (!surface) throw new Error('Chart surface is missing')
              const foreground = rgb(
                isAvatar ? getComputedStyle(element).color : getComputedStyle(element).fill,
              )
              const first = luminance(foreground)
              const second = luminance(rgb(getComputedStyle(surface).backgroundColor))
              return {
                text: element.textContent,
                foreground,
                intended,
                ratio: (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
              }
            })
        })
        expect(contrasts.length).toBeGreaterThan(0)
        for (const result of contrasts) {
          expect(result.foreground, `${route} ${theme} ${result.text}`).toEqual(result.intended)
          expect(result.ratio, `${route} ${theme} rendered text contrast`).toBeGreaterThanOrEqual(
            4.5,
          )
        }
      }
    }
  })

  test('keeps large converted KPI amounts readable within responsive cards', async ({ page }) => {
    await preparePage(page, { theme: 'light', locale: 'ko-KR', currency: 'KRW' })
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window)
      window.fetch = async (input, init) => {
        const response = await originalFetch(input, init)
        const url = input instanceof Request ? input.url : String(input)
        if (new URL(url, location.origin).pathname !== '/api/analytics' || !response.ok)
          return response
        const payload = (await response.json()) as { kpis: { id: string; value: number }[] }
        const revenue = payload.kpis.find((kpi) => kpi.id === 'revenue')
        if (!revenue) throw new Error('The revenue fixture is missing')
        revenue.value = 999_999_999.99
        return new Response(JSON.stringify(payload), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
    })
    await page.goto('/')
    const card = page.locator('[data-metric-card]').first()
    const number = card.locator('[data-number-state]')
    await expect(number.locator('.sr-only')).toHaveText('₩1,349,999,999,987')
    await ready(page)
    const geometry = await number.evaluate((element) => {
      const visible = element.querySelector('span.absolute')
      if (!visible) throw new Error('The number display is missing its visual text')
      return {
        width: visible.clientWidth,
        contentWidth: visible.scrollWidth,
        height: visible.clientHeight,
        contentHeight: visible.scrollHeight,
      }
    })
    expect(geometry.contentWidth).toBeLessThanOrEqual(geometry.width + 1)
    expect(geometry.contentHeight).toBeLessThanOrEqual(geometry.height + 1)
    const mobile = (page.viewportSize()?.width ?? 1440) < 768
    if (mobile) {
      await expect(card).toHaveCSS('min-height', '136px')
      expect((await card.boundingBox())?.height).toBeGreaterThanOrEqual(136)
      await page.setViewportSize({ width: 320, height: 568 })
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
      const overflow = await card.evaluate((element) =>
        [element, ...element.querySelectorAll<HTMLElement>('*')]
          .filter((child) => !child.classList.contains('sr-only'))
          .filter((child) => child.clientWidth > 0 && child.scrollWidth > child.clientWidth + 1)
          .map((child) => ({
            slot: child.getAttribute('data-slot') ?? child.tagName,
            text: child.textContent,
            width: child.clientWidth,
            contentWidth: child.scrollWidth,
          })),
      )
      expect(overflow, 'Large mobile values remain complete at 200% text size').toEqual([])
      expect((await card.boundingBox())?.height).toBeGreaterThan(272)
    } else {
      expect((await card.boundingBox())?.height).toBe(192)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    )
  })
})
