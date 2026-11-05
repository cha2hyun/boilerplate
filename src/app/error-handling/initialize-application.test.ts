import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setErrorReporter, type ErrorReport } from '@/shared/lib/error-reporting'
import { initializeApplication } from './initialize-application'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('application initialization recovery', () => {
  it('mounts the app only after both initialization tasks succeed', async () => {
    let finishDemo!: () => void
    const demo = new Promise<void>((resolve) => {
      finishDemo = resolve
    })
    const ready = vi.fn()
    const startup = initializeApplication({ localization: Promise.resolve(), demo })
    void startup.then(ready)
    await Promise.resolve()
    expect(ready).not.toHaveBeenCalled()
    finishDemo()
    await expect(startup).resolves.toBe('ready')
  })

  it.each(['localization', 'demo'] as const)(
    'recovers immediately when %s fails while the other task is still pending',
    async (phase) => {
      const pending = new Promise<void>(() => undefined)
      const failed = Promise.reject(new Error('initialization failure'))
      await expect(
        initializeApplication({
          localization: phase === 'localization' ? failed : pending,
          demo: phase === 'demo' ? failed : pending,
        }),
      ).resolves.toBe(phase)
    },
  )

  it('observes and reports a second rejection after the first recovery result', async () => {
    let failDemo!: (reason: unknown) => void
    const demo = new Promise<void>((_resolve, reject) => {
      failDemo = reject
    })
    const reporter = vi.fn<(report: ErrorReport) => void>()
    const remove = setErrorReporter(reporter)
    try {
      const startup = initializeApplication({
        localization: Promise.reject(new Error('localization failure')),
        demo,
      })
      await expect(startup).resolves.toBe('localization')
      expect(reporter).toHaveBeenCalledTimes(1)
      failDemo(new Error('later demo failure'))
      await Promise.resolve()
      expect(reporter).toHaveBeenCalledTimes(2)
      await expect(startup).resolves.toBe('localization')
    } finally {
      remove()
    }
  })
})
