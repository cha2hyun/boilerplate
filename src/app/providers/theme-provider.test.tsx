import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type PropsWithChildren } from 'react'
import { useTheme } from '@/shared/lib/theme'
import { ThemeProvider } from './theme-provider'

function Wrapper({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>
}

function mockSystemTheme(dark = false) {
  const query = Object.assign(new EventTarget(), {
    matches: dark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  )
  return query
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('light', 'dark')
  mockSystemTheme()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Vite theme provider', () => {
  it('restores the existing preference, applies its class, and persists a new selection', () => {
    localStorage.setItem('blueprint-theme', 'dark')
    const { result, unmount } = renderHook(useTheme, { wrapper: Wrapper })
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')

    act(() => {
      result.current.setTheme('light')
    })
    expect(localStorage.getItem('blueprint-theme')).toBe('light')
    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement).not.toHaveClass('dark')

    unmount()
    const restored = renderHook(useTheme, { wrapper: Wrapper })
    expect(restored.result.current.theme).toBe('light')
  })

  it('follows live system changes only when system mode is selected', () => {
    const query = mockSystemTheme(true)
    const { result } = renderHook(useTheme, { wrapper: Wrapper })
    expect(result.current.theme).toBe('system')
    expect(document.documentElement).toHaveClass('dark')

    act(() => {
      query.matches = false
      query.dispatchEvent(new Event('change'))
    })
    expect(document.documentElement).toHaveClass('light')

    act(() => {
      result.current.setTheme('dark')
    })
    act(() => {
      query.matches = true
      query.dispatchEvent(new Event('change'))
      query.matches = false
      query.dispatchEvent(new Event('change'))
    })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')

    act(() => {
      result.current.setTheme('system')
    })
    expect(document.documentElement).toHaveClass('light')
  })

  it('uses the default when a stored preference is invalid', () => {
    localStorage.setItem('blueprint-theme', 'unexpected-theme')
    const { result } = renderHook(useTheme, { wrapper: Wrapper })
    expect(result.current.theme).toBe('system')
    expect(document.documentElement).toHaveClass('light')
  })

  it('keeps theme changes functional when storage reads and writes are denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'QuotaExceededError')
    })
    const { result } = renderHook(useTheme, { wrapper: Wrapper })
    expect(result.current.theme).toBe('system')

    act(() => {
      result.current.setTheme('dark')
    })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('releases the media-query subscription on unmount', () => {
    const query = mockSystemTheme()
    const removeListener = vi.spyOn(query, 'removeEventListener')
    const { unmount } = renderHook(useTheme, { wrapper: Wrapper })
    unmount()
    expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
