import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useIsMobile } from './use-mobile'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('reads the initial media query and unsubscribes after viewport changes', () => {
  const query = Object.assign(new EventTarget(), {
    matches: true,
    media: '(max-width: 767px)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  )
  const removeListener = vi.spyOn(query, 'removeEventListener')
  const { result, unmount } = renderHook(useIsMobile)

  expect(result.current).toBe(true)
  act(() => {
    query.matches = false
    query.dispatchEvent(new Event('change'))
  })
  expect(result.current).toBe(false)

  unmount()
  expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function))
})
