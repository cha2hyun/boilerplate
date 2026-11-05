import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setErrorReporter, type ErrorReport } from '@/shared/lib/error-reporting'
import { installGlobalErrorReporting, reactErrorHandlers } from './runtime-errors'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('runtime error connections', () => {
  it('reports browser errors and rejected promises without cancelling events, and removes listeners', () => {
    const target = new EventTarget() as Window
    const reporter = vi.fn<(report: ErrorReport) => void>()
    const removeReporter = setErrorReporter(reporter)
    const removeListeners = installGlobalErrorReporting(target)
    try {
      const error = new Error('private value')
      const event = new ErrorEvent('error', {
        error,
        message: 'private user input',
        filename: 'https://private.test/?token=secret',
        cancelable: true,
      })
      expect(target.dispatchEvent(event)).toBe(true)
      expect(event.defaultPrevented).toBe(false)
      reactErrorHandlers.onUncaughtError(error)
      expect(reporter).toHaveBeenCalledExactlyOnceWith({
        version: 1,
        source: 'window-error',
        kind: 'object',
      })
      const rejection = Object.assign(new Event('unhandledrejection', { cancelable: true }), {
        reason: Symbol('private rejection'),
      })
      expect(target.dispatchEvent(rejection)).toBe(true)
      expect(reporter).toHaveBeenLastCalledWith({
        version: 1,
        source: 'unhandled-rejection',
        kind: 'symbol',
      })
      removeListeners()
      target.dispatchEvent(new ErrorEvent('error', { error: new Error('after cleanup') }))
      expect(reporter).toHaveBeenCalledTimes(2)
    } finally {
      removeListeners()
      removeReporter()
    }
  })

  it('connects all React root callbacks to the same privacy boundary', () => {
    const reporter = vi.fn<(report: ErrorReport) => void>()
    const remove = setErrorReporter(reporter)
    try {
      reactErrorHandlers.onCaughtError(new Error('caught'))
      reactErrorHandlers.onUncaughtError(new Error('uncaught'))
      reactErrorHandlers.onRecoverableError(new Error('recoverable'))
      expect(reporter.mock.calls.map(([report]) => report.source)).toEqual([
        'react-caught',
        'react-uncaught',
        'react-recoverable',
      ])
    } finally {
      remove()
    }
  })

  it('keeps development diagnostics when no reporting service is configured', () => {
    vi.stubEnv('DEV', true)
    const error = new Error('development diagnostic')
    reactErrorHandlers.onCaughtError(error)
    reactErrorHandlers.onUncaughtError(error)
    reactErrorHandlers.onRecoverableError(error)
    expect(console.error).toHaveBeenCalledWith('Application error.', 'react-caught', error)
    expect(console.error).toHaveBeenCalledWith('Application error.', 'react-uncaught', error)
    expect(console.error).toHaveBeenCalledWith('Application error.', 'react-recoverable', error)
  })

  it('keeps production diagnostics free of error text and tolerates a broken console', () => {
    vi.stubEnv('DEV', false)
    const error = new Error('secret@example.com?token=private')
    reactErrorHandlers.onUncaughtError(error)
    expect(console.error).toHaveBeenCalledExactlyOnceWith('Application error.', 'react-uncaught')
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('console failure')
    })
    expect(() => {
      reactErrorHandlers.onRecoverableError(error)
    }).not.toThrow()
  })
})
