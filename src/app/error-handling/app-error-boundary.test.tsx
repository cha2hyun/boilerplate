import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setErrorReporter, type ErrorReport } from '@/shared/lib/error-reporting'
import { ThemeProvider } from '../providers/theme-provider'
import { StartupError } from '../mocks/startup-error'
import { AppErrorBoundary } from './app-error-boundary'
import { reactErrorHandlers } from './runtime-errors'

// Recovery must not even initialize the normal i18n entrypoint.
vi.mock('@/shared/lib/i18n', () => {
  throw new Error('Localization is unavailable')
})

beforeEach(() => {
  localStorage.clear()
  document.documentElement.lang = 'en'
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('provider-independent app recovery', () => {
  it.each([
    ['en-US', 'Unable to display this screen', 'Reload page'],
    ['ko-KR', '화면을 표시하지 못했어요', '새로고침'],
  ])(
    'recovers a provider render failure in persisted %s before localization commits',
    (locale, title, reload) => {
      localStorage.setItem(
        'blueprint-locale-preferences',
        JSON.stringify({ version: 1, state: { locale, currency: 'USD' } }),
      )
      const error = new Error('private form contents token=secret@example.com')
      vi.stubGlobal('matchMedia', () => {
        throw error
      })
      const reporter = vi.fn<(report: ErrorReport) => void>()
      const remove = setErrorReporter(reporter)
      try {
        render(
          <AppErrorBoundary>
            <ThemeProvider>
              <p>Healthy provider child</p>
            </ThemeProvider>
          </AppErrorBoundary>,
          { onCaughtError: reactErrorHandlers.onCaughtError },
        )
        expect(screen.getByRole('heading', { level: 1, name: title })).toHaveFocus()
        expect(screen.getByRole('button', { name: reload })).toBeEnabled()
        expect(screen.getByRole('main')).toHaveAttribute('lang', locale)
        expect(screen.queryByText('Healthy provider child')).not.toBeInTheDocument()
        expect(document.body).not.toHaveTextContent('private form contents')
        expect(reporter).toHaveBeenCalledExactlyOnceWith({
          version: 1,
          source: 'react-caught',
          kind: 'object',
        })
      } finally {
        remove()
      }
    },
  )

  it('keeps the last committed document language when storage is blocked', () => {
    document.documentElement.lang = 'ko-KR'
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })
    render(<StartupError />)
    expect(screen.getByRole('heading', { name: '데모를 시작하지 못했어요' })).toHaveFocus()
    expect(screen.getByRole('button', { name: '새로고침' })).toBeEnabled()
  })

  it.each([
    '{bad json',
    JSON.stringify({ version: 99, state: { locale: 'ko-KR' } }),
    'x'.repeat(4_097),
  ])('still renders recovery with an invalid or oversized saved preference', (saved) => {
    localStorage.setItem('blueprint-locale-preferences', saved)
    render(<StartupError />)
    expect(screen.getByRole('heading', { name: 'Unable to start the demo' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeEnabled()
  })

  it('keeps healthy children visible', () => {
    render(
      <AppErrorBoundary>
        <p>Working screen</p>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('Working screen')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Reload page' })).not.toBeInTheDocument()
  })
})
