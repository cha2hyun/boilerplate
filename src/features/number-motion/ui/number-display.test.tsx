import { act, cleanup, render } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatNumber, type NumberFormatOptions } from '@/shared/lib/format'
import { NumberDisplay } from './number-display'
import { useLocalePreferences } from '@/shared/lib/i18n/preferences'

function createMotionPreference() {
  return Object.assign(new EventTarget(), {
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })
}

let motion: ReturnType<typeof createMotionPreference>
let frames: Map<number, FrameRequestCallback>
let nextFrame: number

beforeEach(() => {
  useLocalePreferences.setState({ locale: 'en-US', currency: 'USD' })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  motion = createMotionPreference()
  frames = new Map()
  nextFrame = 1
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => motion),
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})

afterEach(() => {
  cleanup()
  useLocalePreferences.setState({ locale: 'en-US', currency: 'USD' })
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function advanceTime(milliseconds: number, deliverFrame = false) {
  act(() => {
    vi.advanceTimersByTime(milliseconds)
    if (deliverFrame) {
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach((callback) => {
        callback(performance.now())
      })
    }
  })
}

function setReducedMotion(reduce: boolean) {
  act(() => {
    motion.matches = reduce
    motion.dispatchEvent(new Event('change'))
  })
}

function visualNumber(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>('[aria-hidden="true"]:not(.invisible)')
  if (!element) throw new Error('The visual number is missing.')
  return element
}

function accessibleNumber(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>('[data-number-state] > :not([aria-hidden])')
  if (!element) throw new Error('The accessible final number is missing.')
  return element
}

const integerFormat: NumberFormatOptions = { maximumFractionDigits: 0 }
const currencyFormat: NumberFormatOptions = { style: 'currency', currency: 'USD' }

describe('NumberDisplay', () => {
  it.each(['motion', 'visibility'])(
    'finishes if %s disables motion between render and subscription',
    async (setting) => {
      function PreferenceChange() {
        useLayoutEffect(() => {
          if (setting === 'motion') motion.matches = true
          else vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
        }, [])
        return <NumberDisplay animate value={42} />
      }
      const { container } = render(<PreferenceChange />)
      await act(() => Promise.resolve())
      expect(visualNumber(container)).toHaveTextContent(/^42$/)
      expect(container.querySelector('[data-number-state]')).toHaveAttribute(
        'data-number-state',
        'idle',
      )
      expect(frames.size).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it.each(['motion', 'visibility'])(
    'does not restart a final value if %s permits motion before subscription',
    (setting) => {
      if (setting === 'motion') motion.matches = true
      else vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
      function PreferenceChange() {
        useLayoutEffect(() => {
          motion.matches = false
          vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
        }, [])
        return <NumberDisplay animate value={42} />
      }
      const { container } = render(<PreferenceChange />)
      advanceTime(30, true)
      expect(visualNumber(container)).toHaveTextContent(/^42$/)
      expect(frames.size).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('reserves compact intermediates that are wider than the final unit', () => {
    const { container } = render(
      <NumberDisplay animate value={1000000} format={{ notation: 'compact' }} />,
    )
    const reservations = [...container.querySelectorAll('.invisible')].map(
      (element) => element.textContent,
    )
    expect(reservations).toContain('1M')
    expect(reservations).toContain('875K')
    advanceTime(150, true)
    expect(visualNumber(container)).toHaveTextContent('875K')
    advanceTime(150)
    expect(visualNumber(container)).toHaveTextContent('1M')
    expect(
      [...container.querySelectorAll('.invisible')].map((element) => element.textContent),
    ).toEqual(reservations)
  })

  it('defaults to a static formatted number without scheduling motion', () => {
    const { container } = render(<NumberDisplay value={1234.5} format={currencyFormat} />)
    expect(visualNumber(container)).toHaveTextContent('$1,234.50')
    expect(accessibleNumber(container)).toHaveTextContent('$1,234.50')
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps the complete accessible value and original deadline when wrapping changes', () => {
    const value = 1234567890.5
    const { container, rerender } = render(
      <NumberDisplay animate value={value} format={currencyFormat} />,
    )
    advanceTime(150, true)
    const currentText = visualNumber(container).textContent
    const reservations = [...container.querySelectorAll('.invisible')].map(
      (element) => element.textContent,
    )

    rerender(<NumberDisplay animate wrap value={value} format={currencyFormat} />)
    expect(visualNumber(container).textContent).toBe(currentText)
    expect(accessibleNumber(container)).toHaveTextContent('$1,234,567,890.50')
    expect(
      [...container.querySelectorAll('.invisible')].map((element) => element.textContent),
    ).toEqual(reservations)
    advanceTime(150)
    expect(visualNumber(container)).toHaveTextContent('$1,234,567,890.50')
    expect(container.querySelector('[data-number-state]')).toHaveAttribute(
      'data-number-state',
      'idle',
    )
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops immediately when disabled and starts a fresh transition when enabled', () => {
    const { container, rerender } = render(
      <NumberDisplay animate value={100400} format={{ notation: 'compact' }} />,
    )
    advanceTime(100, true)
    rerender(<NumberDisplay animate={false} value={100400} format={{ notation: 'compact' }} />)
    expect(visualNumber(container)).toHaveTextContent('100.4K')
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    rerender(<NumberDisplay animate value={100400} format={{ notation: 'compact' }} />)
    expect(visualNumber(container)).toHaveTextContent(/^0$/)
    advanceTime(300)
    expect(visualNumber(container)).toHaveTextContent('100.4K')
  })

  it.each([null, undefined, NaN, Infinity, -Infinity])(
    'does not animate missing or nonfinite value %s',
    (value) => {
      const { container } = render(<NumberDisplay animate value={value} />)
      expect(visualNumber(container)).toHaveTextContent('—')
      expect(frames.size).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('reserves the final formatted text throughout a transition', () => {
    const { container } = render(
      <NumberDisplay
        animate
        value={100400}
        format={{ notation: 'compact', style: 'currency', currency: 'USD' }}
      />,
    )
    const reservation = container.querySelector('.invisible')
    expect(reservation).toHaveTextContent('$100.4K')
    expect(reservation).toHaveAttribute('aria-hidden', 'true')
    advanceTime(100, true)
    expect(reservation).toHaveTextContent('$100.4K')
    advanceTime(200)
    expect(reservation).toHaveTextContent('$100.4K')
  })

  it('formats negative amounts and hidden currency consistently during motion', () => {
    const { container } = render(
      <NumberDisplay
        animate
        value={-1234.5}
        format={{ style: 'currency', currency: 'USD', showCurrency: false }}
      />,
    )
    advanceTime(100, true)
    expect(visualNumber(container).textContent).toMatch(/^-\d[\d,]*\.\d{2}$/)
    expect(accessibleNumber(container)).toHaveTextContent('-1,234.50')
    advanceTime(200)
    expect(visualNumber(container)).toHaveTextContent('-1,234.50')
  })

  it('reaches the exact final value at 300 ms even when no animation frames arrive', () => {
    const { container } = render(<NumberDisplay animate value={123.45} format={currencyFormat} />)
    expect(visualNumber(container)).toHaveTextContent('$0.00')
    expect(visualNumber(container)).toHaveAttribute('aria-hidden', 'true')
    expect(accessibleNumber(container)).toHaveTextContent('$123.45')

    advanceTime(299)
    expect(visualNumber(container)).toHaveTextContent('$0.00')
    advanceTime(1)
    expect(visualNumber(container)).toHaveTextContent('$123.45')
    expect(accessibleNumber(container)).toHaveTextContent('$123.45')
    expect(frames.size).toBe(0)
  })

  it('shows whole counts between frames while exposing only the final accessible value', () => {
    const { container } = render(<NumberDisplay animate value={1200} format={integerFormat} />)
    advanceTime(80, true)
    const displayed = visualNumber(container).textContent
    const numeric = Number(displayed.replaceAll(',', ''))
    expect(numeric).toBeGreaterThan(0)
    expect(numeric).toBeLessThan(1200)
    expect(Number.isInteger(numeric)).toBe(true)
    expect(accessibleNumber(container)).toHaveTextContent('1,200')
    expect(container.querySelectorAll('[data-number-state] > :not([aria-hidden])')).toHaveLength(1)

    advanceTime(220)
    expect(visualNumber(container)).toHaveTextContent('1,200')
  })

  it.each([
    { value: 12.34, format: currencyFormat, expected: '$12.34' },
    {
      value: 3.62,
      format: { style: 'percent', minimumFractionDigits: 2 } satisfies NumberFormatOptions,
      expected: '3.62%',
    },
  ])(
    'preserves the formatter and exact decimal target $expected',
    ({ value, format, expected }) => {
      const { container } = render(<NumberDisplay animate value={value} format={format} />)
      advanceTime(100, true)
      expect(visualNumber(container).textContent).not.toBe(formatNumber(0, format))
      expect(visualNumber(container).textContent).not.toBe(expected)
      expect(accessibleNumber(container)).toHaveTextContent(expected)
      advanceTime(200)
      expect(visualNumber(container)).toHaveTextContent(expected)
    },
  )

  it('does not restart for a parent rerender or new format options', () => {
    const { container, rerender } = render(
      <NumberDisplay animate value={1200} format={integerFormat} />,
    )
    advanceTime(150, true)
    const midway = visualNumber(container).textContent
    rerender(<NumberDisplay animate value={1200} format={{ maximumFractionDigits: 0 }} />)
    expect(visualNumber(container)).toHaveTextContent(midway)
    rerender(
      <NumberDisplay
        animate
        value={1200}
        format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      />,
    )
    expect(visualNumber(container)).toHaveTextContent(`$${midway}`)
    expect(accessibleNumber(container)).toHaveTextContent('$1,200')
    advanceTime(150)
    expect(visualNumber(container)).toHaveTextContent('$1,200')
  })

  it('reuses prepared text during motion, wrapping and equivalent option rerenders', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, 'format')
    if (!descriptor?.get) throw new Error('Intl.NumberFormat.format must expose its native getter.')
    // TypeScript declares a method; the native accessor returns the instance-bound format function.
    const formatCalls = vi.fn(function (this: Intl.NumberFormat) {
      return descriptor.get?.call(this) as Intl.NumberFormat['format']
    })
    Object.defineProperty(Intl.NumberFormat.prototype, 'format', {
      ...descriptor,
      get: formatCalls,
    })
    try {
      const { container, rerender } = render(
        <NumberDisplay animate value={1000000} format={{ notation: 'compact' }} />,
      )
      const preparedCalls = formatCalls.mock.calls.length
      expect(preparedCalls).toBeGreaterThan(0)
      const reservationTexts = [...container.querySelectorAll('.invisible')].map(
        (element) => element.textContent,
      )
      advanceTime(150, true)
      expect(visualNumber(container)).toHaveTextContent('875K')
      rerender(<NumberDisplay animate wrap value={1000000} format={{ notation: 'compact' }} />)
      advanceTime(150)
      expect(formatCalls).toHaveBeenCalledTimes(preparedCalls)
      expect(visualNumber(container)).toHaveTextContent('1M')
      expect(
        [...container.querySelectorAll('.invisible')].map((element) => element.textContent),
      ).toEqual(reservationTexts)
    } finally {
      Object.defineProperty(Intl.NumberFormat.prototype, 'format', descriptor)
    }
  })

  it('updates locale during motion without restarting its 300 ms deadline', () => {
    const { container } = render(
      <NumberDisplay animate value={100400} format={{ notation: 'compact' }} />,
    )
    advanceTime(150, true)
    act(() => {
      useLocalePreferences.getState().setLocale('ko-KR')
    })
    expect(visualNumber(container)).toHaveTextContent('8.8만')
    expect(accessibleNumber(container)).toHaveTextContent('10만')
    advanceTime(150)
    expect(visualNumber(container)).toHaveTextContent('10만')
    expect(container.querySelector('[data-number-state]')).toHaveAttribute(
      'data-number-state',
      'idle',
    )
    expect(frames.size).toBe(0)
  })

  it('starts a new bounded transition when the target changes', () => {
    const { container, rerender } = render(
      <NumberDisplay animate value={100} format={integerFormat} />,
    )
    advanceTime(80, true)
    rerender(<NumberDisplay animate value={200} format={integerFormat} />)
    expect(visualNumber(container)).toHaveTextContent(/^0$/)
    expect(accessibleNumber(container)).toHaveTextContent(/^200$/)

    // The old value's deadline must not finish the new value's transition.
    advanceTime(220)
    expect(visualNumber(container)).toHaveTextContent(/^0$/)
    advanceTime(80)
    expect(visualNumber(container)).toHaveTextContent(/^200$/)
  })

  it('counts again when a fresh component reads the same value from Query cache', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
    })
    client.setQueryData(['cached-metric'], 1200)
    const fetchMetric = vi.fn(() => Promise.resolve(1200))
    function CachedMetric() {
      const metric = useQuery({ queryKey: ['cached-metric'], queryFn: fetchMetric })
      return metric.data === undefined ? null : (
        <NumberDisplay animate value={metric.data} format={integerFormat} />
      )
    }
    const first = render(
      <QueryClientProvider client={client}>
        <CachedMetric />
      </QueryClientProvider>,
    )
    advanceTime(300)
    expect(visualNumber(first.container)).toHaveTextContent('1,200')
    first.unmount()

    const second = render(
      <QueryClientProvider client={client}>
        <CachedMetric />
      </QueryClientProvider>,
    )
    expect(visualNumber(second.container)).toHaveTextContent(/^0$/)
    expect(accessibleNumber(second.container)).toHaveTextContent('1,200')
    expect(fetchMetric).not.toHaveBeenCalled()
    advanceTime(300)
    expect(visualNumber(second.container)).toHaveTextContent('1,200')
    second.unmount()
    client.clear()
  })

  it('renders the final number immediately when reduced motion is already enabled', () => {
    motion.matches = true
    const { container } = render(<NumberDisplay animate value={42} format={integerFormat} />)
    expect(visualNumber(container)).toHaveTextContent(/^42$/)
    expect(accessibleNumber(container)).toHaveTextContent(/^42$/)
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('finishes immediately when reduced motion is enabled during a transition', () => {
    const { container } = render(<NumberDisplay animate value={1200} format={integerFormat} />)
    advanceTime(60, true)
    expect(visualNumber(container).textContent).not.toBe('1,200')
    setReducedMotion(true)
    expect(visualNumber(container)).toHaveTextContent('1,200')
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    advanceTime(500)
    expect(visualNumber(container)).toHaveTextContent('1,200')
  })

  it.each([true, false])(
    'keeps a completed number final when reduced motion is later disabled (initially %s)',
    (initiallyReduced) => {
      motion.matches = initiallyReduced
      const { container } = render(<NumberDisplay animate value={1200} format={integerFormat} />)
      if (!initiallyReduced) {
        advanceTime(60, true)
        setReducedMotion(true)
      }
      expect(visualNumber(container)).toHaveTextContent('1,200')
      setReducedMotion(false)
      expect(visualNumber(container)).toHaveTextContent('1,200')
      expect(frames.size).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('finishes when the document is hidden instead of waiting for suspended frames', () => {
    const { container } = render(<NumberDisplay animate value={42} format={integerFormat} />)
    advanceTime(60, true)
    act(() => {
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(visualNumber(container)).toHaveTextContent(/^42$/)
    expect(frames.size).toBe(0)
  })

  it('cancels pending frames, deadlines, and motion subscriptions on unmount', () => {
    const unsubscribe = vi.spyOn(motion, 'removeEventListener')
    const { unmount } = render(<NumberDisplay animate value={42} format={integerFormat} />)
    advanceTime(60, true)
    expect(frames.size).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(unsubscribe).toHaveBeenCalledWith('change', expect.any(Function))
    advanceTime(300)
    expect(frames.size).toBe(0)
  })
})
