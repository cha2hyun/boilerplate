import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { trafficQueryOptions } from './queries'
import { getSampleTraffic } from './seed'

vi.mock('@/shared/config', () => ({ env: { dataSource: 'api', apiBaseUrl: '/api' } }))
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('traffic HTTP response boundary', () => {
  it('caches normalized dates rather than the server array order', async () => {
    const sample = getSampleTraffic('7')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ...sample, days: sample.days.toReversed() })),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      const result = await client.query(trafficQueryOptions('7'))
      expect(result.days).toEqual(sample.days)
      expect(client.getQueryData(trafficQueryOptions('7').queryKey)).toEqual(result)
    } finally {
      client.clear()
    }
  })

  it('keeps valid cached data when a refresh contains duplicate dates', async () => {
    const sample = getSampleTraffic('7')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ ...sample, days: [...sample.days, sample.days[0]] })),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const options = trafficQueryOptions('7')
    client.setQueryData(options.queryKey, sample)
    try {
      await client.invalidateQueries({ queryKey: options.queryKey })
      await expect(client.query(options)).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
        status: 200,
        mayHaveSucceeded: false,
      })
      expect(client.getQueryData(options.queryKey)).toEqual(sample)
    } finally {
      client.clear()
    }
  })
})
