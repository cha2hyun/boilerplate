import { describe, expect, it, vi } from 'vitest'
import { createErrorReporting, type ErrorContext, type ErrorReport } from './error-reporting'

describe('privacy-preserving error reporting', () => {
  it('does nothing until an adapter is explicitly installed', () => {
    const reporting = createErrorReporting()
    const fetch = vi.spyOn(globalThis, 'fetch')
    const log = vi.spyOn(console, 'error')
    reporting.reportError(new Error('private input'), { source: 'startup' })
    expect(fetch).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
  })

  it('delivers only a frozen, bounded allowlist without inspecting thrown values', () => {
    const reporting = createErrorReporting()
    const reporter = vi.fn<(report: ErrorReport) => void>()
    reporting.setErrorReporter(reporter)
    const access = vi.fn(() => {
      throw new Error('A property must not be read')
    })
    const error = new Proxy(new Error('secret@example.com?token=private'), {
      get: access,
      getPrototypeOf: access,
    })
    reporting.reportError(error, {
      source: 'route',
      message: 'private form contents',
      stack: 'private stack',
      url: 'https://private.test/?token=secret',
    } as ErrorContext)
    expect(access).not.toHaveBeenCalled()
    expect(reporter).toHaveBeenCalledExactlyOnceWith({
      version: 1,
      source: 'route',
      kind: 'object',
    })
    expect(Object.isFrozen(reporter.mock.calls[0]?.[0])).toBe(true)
  })

  it('safely accepts revoked proxies, symbols and throwing context getters', () => {
    const reporting = createErrorReporting()
    const reporter = vi.fn<(report: ErrorReport) => void>()
    reporting.setErrorReporter(reporter)
    const { proxy, revoke } = Proxy.revocable({}, {})
    revoke()
    expect(() => {
      reporting.reportError(proxy, {
        get source(): 'startup' {
          throw new Error('context unavailable')
        },
      })
      reporting.reportError(Symbol('private description'), { source: 'window-error' })
      reporting.reportError(null, { source: 'private url' } as unknown as ErrorContext)
    }).not.toThrow()
    expect(reporter.mock.calls.map(([report]) => report)).toEqual([
      { version: 1, source: 'unknown', kind: 'object' },
      { version: 1, source: 'window-error', kind: 'symbol' },
      { version: 1, source: 'unknown', kind: 'null' },
    ])
  })

  it('coalesces an object across root, boundary and browser hooks, but allows later retries', () => {
    const reporting = createErrorReporting()
    const reporter = vi.fn<(report: ErrorReport) => void>()
    reporting.setErrorReporter(reporter)
    const now = vi.spyOn(Date, 'now').mockReturnValue(100)
    const error = new Error('same failure')
    reporting.reportError(error, { source: 'react-caught' })
    reporting.reportError(error, { source: 'app-boundary' })
    reporting.reportError(error, { source: 'window-error' })
    reporting.reportError(error, { source: 'unhandled-rejection' })
    expect(reporter).toHaveBeenCalledTimes(1)
    reporting.reportError(new Error('different failure'), { source: 'route' })
    expect(reporter).toHaveBeenCalledTimes(2)
    now.mockReturnValue(5_100)
    reporting.reportError(error, { source: 'app-boundary' })
    expect(reporter).toHaveBeenCalledTimes(3)
  })

  it('coalesces primitive throws by type without retaining or forwarding their contents', () => {
    const reporting = createErrorReporting()
    const reporter = vi.fn<(report: ErrorReport) => void>()
    reporting.setErrorReporter(reporter)
    reporting.reportError('private one', { source: 'react-caught' })
    reporting.reportError('private two', { source: 'route' })
    reporting.reportError(42, { source: 'window-error' })
    expect(reporter.mock.calls.map(([report]) => report)).toEqual([
      { version: 1, source: 'react-caught', kind: 'string' },
      { version: 1, source: 'window-error', kind: 'number' },
    ])
  })

  it('contains synchronous adapter failure and recursive reports, then accepts the next error', () => {
    const reporting = createErrorReporting()
    const reporter = vi.fn(() => {
      reporting.reportError(new Error('nested report'), { source: 'window-error' })
      throw new Error('adapter failure')
    })
    reporting.setErrorReporter(reporter)
    expect(() => {
      reporting.reportError(new Error('original failure'), { source: 'route' })
      reporting.reportError(new Error('next failure'), { source: 'route' })
    }).not.toThrow()
    expect(reporter).toHaveBeenCalledTimes(2)
  })

  it('observes async rejection without feeding it back into reporting', async () => {
    const reporting = createErrorReporting()
    const reporter = vi.fn(async () => {
      await Promise.resolve()
      throw new Error('rejected adapter')
    })
    reporting.setErrorReporter(reporter)
    reporting.reportError(new Error('original failure'), { source: 'route' })
    await expect(reporter.mock.results[0]?.value).rejects.toThrow('rejected adapter')
    expect(reporter).toHaveBeenCalledTimes(1)
    reporting.reportError(new Error('next failure'), { source: 'route' })
    await expect(reporter.mock.results[1]?.value).rejects.toThrow('rejected adapter')
    expect(reporter).toHaveBeenCalledTimes(2)
  })

  it('delivers independent errors even when a previous adapter promise never settles', () => {
    const reporting = createErrorReporting()
    const reporter = vi.fn(() => new Promise<void>(() => undefined))
    reporting.setErrorReporter(reporter)
    reporting.reportError(new Error('first'), { source: 'route' })
    reporting.reportError(new Error('second'), { source: 'window-error' })
    expect(reporter).toHaveBeenCalledTimes(2)
  })

  it('uninstalls the adapter and tolerates a thenable whose then getter throws', async () => {
    const reporting = createErrorReporting()
    const thenable = Object.defineProperty({}, 'then', {
      get() {
        throw new Error('broken adapter thenable')
      },
    }) as Promise<void>
    const reporter = vi.fn(() => thenable)
    const remove = reporting.setErrorReporter(reporter)
    reporting.reportError(new Error('first'), { source: 'startup' })
    await Promise.resolve()
    reporting.reportError(new Error('second'), { source: 'startup' })
    expect(reporter).toHaveBeenCalledTimes(2)
    remove()
    reporting.reportError(new Error('third'), { source: 'startup' })
    expect(reporter).toHaveBeenCalledTimes(2)
  })
})
