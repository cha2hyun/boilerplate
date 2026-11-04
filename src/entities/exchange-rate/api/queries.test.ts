// @vitest-environment node
import { CancelledError, QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXCHANGE_RATE_URL, exchangeRateKeys, exchangeRateQueryOptions } from './queries'

// Deliberate fixture values: runtime rates always come from the public API.
const referenceRate = { date: '2026-11-04', base: 'USD', quote: 'KRW', rate: 1200 }
let client: QueryClient

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

beforeEach(() => {
  client = new QueryClient()
})

afterEach(() => {
  client.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('USD/KRW reference-rate HTTP boundary and cache', () => {
  it('shares concurrent readers and fresh revisits without credentials or a referrer', async () => {
    const response = deferred<Response>()
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(response.promise)
    vi.stubGlobal('fetch', fetchMock)

    const first = client.query(exchangeRateQueryOptions())
    const second = client.query(exchangeRateQueryOptions())
    response.resolve(Response.json(referenceRate))
    const [firstResult, secondResult] = await Promise.all([first, second])
    expect(firstResult).toEqual(referenceRate)
    expect(secondResult).toBe(firstResult)
    await expect(client.query(exchangeRateQueryOptions())).resolves.toEqual(referenceRate)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      EXCHANGE_RATE_URL,
      expect.objectContaining({
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
      }),
    )
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.has('Authorization')).toBe(false)
  })

  it('keeps rates fresh for six hours and removes unused data after twenty-four hours', async () => {
    vi.useFakeTimers()
    const now = Date.UTC(2026, 10, 4)
    vi.setSystemTime(now)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(referenceRate)))
    vi.stubGlobal('fetch', fetchMock)

    await client.query(exchangeRateQueryOptions())
    vi.setSystemTime(now + 6 * 60 * 60 * 1000 - 1)
    await client.query(exchangeRateQueryOptions())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.setSystemTime(now + 6 * 60 * 60 * 1000 + 1)
    await client.query(exchangeRateQueryOptions())
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000 + 1)
    expect(client.getQueryData(exchangeRateKeys.usdKrw())).toBeUndefined()
  })

  it.each([
    { name: 'wrong base', body: { ...referenceRate, base: 'EUR' } },
    { name: 'wrong quote', body: { ...referenceRate, quote: 'USD' } },
    { name: 'zero rate', body: { ...referenceRate, rate: 0 } },
    { name: 'negative rate', body: { ...referenceRate, rate: -1 } },
    { name: 'text rate', body: { ...referenceRate, rate: '1200' } },
    { name: 'missing rate', body: { ...referenceRate, rate: null } },
    { name: 'impossible date', body: { ...referenceRate, date: '2026-02-30' } },
    {
      name: 'timestamp instead of business date',
      body: { ...referenceRate, date: '2026-11-04T00:00:00Z' },
    },
  ])('rejects $name without retrying or caching the response', async ({ body }) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body))
    vi.stubGlobal('fetch', fetchMock)

    await expect(client.query(exchangeRateQueryOptions())).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 200,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(exchangeRateKeys.usdKrw())).toBeUndefined()
  })

  it('rejects a numeric JSON value that overflows to infinity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"date":"2026-11-04","base":"USD","quote":"KRW","rate":1e400}', {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    await expect(client.query(exchangeRateQueryOptions())).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
    expect(client.getQueryData(exchangeRateKeys.usdKrw())).toBeUndefined()
  })

  it.each([
    { status: 404, calls: 1 },
    { status: 503, calls: 2 },
  ])('preserves HTTP $status and applies its retry policy', async ({ status, calls }) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(new Response('Private provider diagnostics', { status })),
      )
    vi.stubGlobal('fetch', fetchMock)

    const pending = client.query({ ...exchangeRateQueryOptions(), retryDelay: 0 })
    await expect(pending).rejects.toMatchObject({ code: 'HTTP_ERROR', status })
    await expect(pending).rejects.not.toThrow('Private provider diagnostics')
    expect(fetchMock).toHaveBeenCalledTimes(calls)
    expect(client.getQueryData(exchangeRateKeys.usdKrw())).toBeUndefined()
  })

  it('retains the last valid rate when a refresh returns an invalid payload', async () => {
    client.setQueryData(exchangeRateKeys.usdKrw(), referenceRate)
    await client.invalidateQueries({ queryKey: exchangeRateKeys.all })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...referenceRate, rate: 0 })))

    await expect(client.query(exchangeRateQueryOptions())).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
    expect(client.getQueryData(exchangeRateKeys.usdKrw())).toEqual(referenceRate)
  })

  it('forwards Query cancellation to fetch and never caches a cancelled response', async () => {
    const started = deferred<AbortSignal>()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        (_input, options) =>
          new Promise((_resolve, reject) => {
            const signal = options?.signal
            if (!signal) throw new Error('The exchange-rate request must be cancellable.')
            started.resolve(signal)
            signal.addEventListener(
              'abort',
              () => {
                const reason: unknown = signal.reason
                reject(
                  reason instanceof Error
                    ? reason
                    : new DOMException('Request aborted.', 'AbortError'),
                )
              },
              { once: true },
            )
          }),
      ),
    )

    const outcome = client.query(exchangeRateQueryOptions()).catch((error: unknown) => error)
    const signal = await started.promise
    await client.cancelQueries({ queryKey: exchangeRateKeys.all })

    expect(signal.aborted).toBe(true)
    expect(await outcome).toBeInstanceOf(CancelledError)
    expect(client.getQueryData(exchangeRateKeys.usdKrw())).toBeUndefined()
  })
})
