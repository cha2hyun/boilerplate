import { act, cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnimatedNumber } from './animated-number'

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

const formatInteger = (value: number) => new Intl.NumberFormat('en-US').format(value)
const formatCurrency = (value: number) => `$${value.toFixed(2)}`

describe('AnimatedNumber', () => {
  it('reaches the exact final value at 240 ms even when no animation frames arrive', () => {
    const { container } = render(<AnimatedNumber value={123.45} format={formatCurrency} />)
    expect(visualNumber(container)).toHaveTextContent('$0.00')
    expect(visualNumber(container)).toHaveAttribute('aria-hidden', 'true')
    expect(accessibleNumber(container)).toHaveTextContent('$123.45')

    advanceTime(239)
    expect(visualNumber(container)).toHaveTextContent('$0.00')
    advanceTime(1)
    expect(visualNumber(container)).toHaveTextContent('$123.45')
    expect(accessibleNumber(container)).toHaveTextContent('$123.45')
    expect(frames.size).toBe(0)
  })

  it('shows whole counts between frames while exposing only the final accessible value', () => {
    const { container } = render(<AnimatedNumber value={1200} format={formatInteger} />)
    advanceTime(80, true)
    const displayed = visualNumber(container).textContent
    const numeric = Number(displayed.replaceAll(',', ''))
    expect(numeric).toBeGreaterThan(0)
    expect(numeric).toBeLessThan(1200)
    expect(Number.isInteger(numeric)).toBe(true)
    expect(accessibleNumber(container)).toHaveTextContent('1,200')
    expect(container.querySelectorAll('[data-number-state] > :not([aria-hidden])')).toHaveLength(1)

    advanceTime(160)
    expect(visualNumber(container)).toHaveTextContent('1,200')
  })

  it.each([
    { value: 12.34, format: formatCurrency, expected: '$12.34' },
    { value: 3.62, format: (value: number) => `${value.toFixed(2)}%`, expected: '3.62%' },
  ])(
    'preserves the formatter and exact decimal target $expected',
    ({ value, format, expected }) => {
      const { container } = render(<AnimatedNumber value={value} format={format} />)
      advanceTime(100, true)
      expect(visualNumber(container).textContent).not.toBe(format(0))
      expect(visualNumber(container).textContent).not.toBe(expected)
      expect(accessibleNumber(container)).toHaveTextContent(expected)
      advanceTime(140)
      expect(visualNumber(container)).toHaveTextContent(expected)
    },
  )

  it('does not restart for a parent rerender or a new formatter function', () => {
    const { container, rerender } = render(<AnimatedNumber value={1200} format={formatInteger} />)
    advanceTime(120, true)
    const midway = visualNumber(container).textContent
    rerender(<AnimatedNumber value={1200} format={(value) => `${formatInteger(value)} USD`} />)
    expect(visualNumber(container)).toHaveTextContent(`${midway} USD`)
    expect(accessibleNumber(container)).toHaveTextContent('1,200 USD')
    advanceTime(120)
    expect(visualNumber(container)).toHaveTextContent('1,200 USD')
  })

  it('starts a new bounded transition when the target changes', () => {
    const { container, rerender } = render(<AnimatedNumber value={100} format={formatInteger} />)
    advanceTime(80, true)
    rerender(<AnimatedNumber value={200} format={formatInteger} />)
    expect(visualNumber(container)).toHaveTextContent(/^0$/)
    expect(accessibleNumber(container)).toHaveTextContent(/^200$/)

    // The old value's deadline must not finish the new value's transition.
    advanceTime(160)
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
        <AnimatedNumber value={metric.data} format={formatInteger} />
      )
    }
    const first = render(
      <QueryClientProvider client={client}>
        <CachedMetric />
      </QueryClientProvider>,
    )
    advanceTime(240)
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
    advanceTime(240)
    expect(visualNumber(second.container)).toHaveTextContent('1,200')
    second.unmount()
    client.clear()
  })

  it('renders the final number immediately when reduced motion is already enabled', () => {
    motion.matches = true
    const { container } = render(<AnimatedNumber value={42} format={formatInteger} />)
    expect(visualNumber(container)).toHaveTextContent(/^42$/)
    expect(accessibleNumber(container)).toHaveTextContent(/^42$/)
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('finishes immediately when reduced motion is enabled during a transition', () => {
    const { container } = render(<AnimatedNumber value={1200} format={formatInteger} />)
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
      const { container } = render(<AnimatedNumber value={1200} format={formatInteger} />)
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
    const { container } = render(<AnimatedNumber value={42} format={formatInteger} />)
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
    const { unmount } = render(<AnimatedNumber value={42} format={formatInteger} />)
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
