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

function resolveTokenColor(page: Page, token: string) {
  return page.evaluate((token) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${token})`
    document.body.append(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return value
  }, token)
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
          ['chip', 'chip-foreground'],
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

  test('renders chart series, readable axes and avatar initials in both themes', async ({
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
        if (route !== '/projects') {
          const series: Record<string, string> =
            route === '/'
              ? { revenue: '--chart-highlight', previousRevenue: '--chart-1' }
              : { visitors: '--chart-highlight', sessions: '--chart-3' }
          await page.locator('svg.recharts-surface').first().hover()
          const tooltip = page.locator('[data-slot="chart-tooltip-content"]')
          await expect(tooltip).toBeVisible()
          for (const [key, token] of Object.entries(series)) {
            const expected = await resolveTokenColor(page, token)
            const curve = page.locator(`.recharts-area-curve[stroke="var(--color-${key})"]`)
            const marker = page.locator(`.recharts-legend-wrapper [style*="var(--color-${key})"]`)
            const indicator = tooltip.locator(`[style*="var(--color-${key})"]`)
            await expect(curve).toHaveCSS('stroke', expected)
            await expect(marker).toHaveCSS('background-color', expected)
            await expect(indicator).toHaveCSS('background-color', expected)
          }
        }
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

  test('highlights only a unique positive device leader and matches its bar and tooltip colors', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'The chart palette is shared across viewports.')
    await preparePage(page, { theme: 'dark', locale: 'ko-KR', currency: 'USD' })
    const periods = [
      {
        period: '30',
        rows: [
          ['Mobile', 2, '--chart-2'],
          ['Tablet', 8, '--chart-bar-highlight'],
          ['Desktop', 4, '--chart-1'],
        ],
      },
      {
        period: '14',
        rows: [
          ['Tablet', 7, '--chart-3'],
          ['Desktop', 2, '--chart-1'],
          ['Mobile', 7, '--chart-2'],
        ],
      },
      { period: '7', rows: [['Desktop', 0, '--chart-1']] },
    ] as const
    await page.addInitScript((periods) => {
      const originalFetch = window.fetch.bind(window)
      window.fetch = async (input, init) => {
        const response = await originalFetch(input, init)
        const url = new URL(input instanceof Request ? input.url : String(input), location.origin)
        if (url.pathname !== '/api/traffic' || !response.ok) return response
        const fixture = periods.find(({ period }) => period === url.searchParams.get('period'))
        if (!fixture) throw new Error('The requested device fixture is missing')
        const payload = (await response.json()) as Record<string, unknown>
        return Response.json({
          ...payload,
          devices: fixture.rows.map(([device, sessions]) => ({ device, sessions })),
        })
      }
    }, periods)

    for (const { period, rows } of periods) {
      await page.goto(`/analytics?period=${period}`)
      await ready(page)
      const chart = page
        .locator('[data-slot="chart"]')
        .filter({ has: page.locator('.recharts-bar') })
      const bars = chart.locator('.recharts-bar-rectangle path.recharts-rectangle')
      const tooltip = chart.locator('[data-slot="chart-tooltip-content"]')
      const deviceLabels = page.locator('[data-slot="card"]').filter({ has: chart }).locator('dt')
      for (const [index, [, sessions, token]] of rows.entries()) {
        const expected = await resolveTokenColor(page, token)
        const label = deviceLabels.nth(index)
        await expect(label.locator('svg')).toHaveCSS('fill', expected)
        if (sessions > 0) {
          await expect(bars.nth(index)).toHaveCSS('fill', expected)
          await bars.nth(index).hover()
        } else {
          await chart.getByRole('application').focus()
          await page.keyboard.press('ArrowRight')
        }
        await expect(tooltip).toContainText(await label.innerText())
        await expect(tooltip.locator('[data-slot="chart-tooltip-value"]')).toHaveText(
          String(sessions),
        )
        await expect(tooltip.locator('[style*="--color-bg"]')).toHaveCSS(
          'background-color',
          expected,
        )
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

for (const theme of ['light', 'dark'] as const) {
  test(`keeps rendered form boundaries and keyboard focus at three-to-one contrast (${theme})`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Shared control colors are checked once per theme.',
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await preparePage(page, { theme, locale: 'en-US', currency: 'USD' })
    await page.goto('/projects')
    await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`))
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await page.getByRole('button', { name: 'New project', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a project', exact: true })
    const controls = [
      dialog.getByRole('textbox', { name: 'Project name', exact: true }),
      dialog.getByRole('textbox', { name: 'Description (optional)', exact: true }),
      dialog.getByRole('combobox', { name: 'Status', exact: true }),
    ]
    for (const control of controls) {
      // Set up the idle state; focus contrast below is measured after real Tab navigation.
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus()
      await expect(control).not.toBeFocused()
      const idleShadow = await control.evaluate((element) => getComputedStyle(element).boxShadow)
      const measure = async () =>
        control.evaluate((element) => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error('Canvas color conversion is unavailable')
          const parents: Element[] = []
          for (let parent = element.parentElement; parent; parent = parent.parentElement)
            parents.unshift(parent)
          const surface = () => {
            context.clearRect(0, 0, 1, 1)
            for (const parent of parents) {
              context.fillStyle = getComputedStyle(parent).backgroundColor
              context.fillRect(0, 0, 1, 1)
            }
          }
          const channels = () => Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
          const luminance = (values: number[]) =>
            values.reduce((total, value, index) => {
              const srgb = value / 255
              return (
                total +
                [0.2126, 0.7152, 0.0722][index]! *
                  (srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4)
              )
            }, 0)
          const ratio = (first: number[], second: number[]) =>
            (Math.max(luminance(first), luminance(second)) + 0.05) /
            (Math.min(luminance(first), luminance(second)) + 0.05)
          const style = getComputedStyle(element)
          surface()
          const outside = channels()
          context.fillStyle = style.backgroundColor
          context.fillRect(0, 0, 1, 1)
          const inside = channels()
          context.fillStyle = style.borderTopColor
          context.fillRect(0, 0, 1, 1)
          const border = channels()
          surface()
          context.fillStyle = style.getPropertyValue('--tw-ring-color') || 'transparent'
          context.fillRect(0, 0, 1, 1)
          return {
            boundary: Math.min(ratio(border, outside), ratio(border, inside)),
            focus: ratio(channels(), outside),
            focusVisible: element.matches(':focus-visible'),
          }
        })
      await expect
        .poll(async () => (await measure()).boundary, {
          message: `${theme}: unfocused input boundary`,
        })
        .toBeGreaterThanOrEqual(3)
      // Reach the control with actual keyboard traversal, not programmatic focus.
      await page.keyboard.press('Tab')
      for (
        let steps = 0;
        steps < 12 && !(await control.evaluate((element) => element === document.activeElement));
        steps += 1
      )
        await page.keyboard.press('Tab')
      await expect(control).toBeFocused()
      await expect.poll(async () => (await measure()).focusVisible).toBe(true)
      await expect(control).not.toHaveCSS('box-shadow', idleShadow)
      await expect
        .poll(async () => (await measure()).focus, {
          message: `${theme}: composited keyboard ring`,
        })
        .toBeGreaterThanOrEqual(3)
      if (control === controls[0]) {
        await control.fill('x')
        await control.press('Enter')
        await expect(control).toHaveAttribute('aria-invalid', 'true')
        await expect
          .poll(async () => (await measure()).focus, {
            message: `${theme}: invalid field focus ring`,
          })
          .toBeGreaterThanOrEqual(3)
        await control.fill('')
      }
    }
    await page.keyboard.press('Escape')
  })
}
