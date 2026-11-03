// @vitest-environment node
import { CancelledError, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsQueryOptions } from '@/entities/analytics'
import { customersQueryOptions } from '@/entities/customer'
import { orderKeys, ordersQueryOptions, sampleOrders } from '@/entities/order'
import { getSampleTraffic, trafficKeys, trafficQueryOptions } from '@/entities/traffic'
import { handlers } from './handlers'

vi.mock('@/shared/config', () => ({
  env: { dataSource: 'demo', apiBaseUrl: 'http://localhost/api' },
}))

const server = setupServer(...handlers)
const requests: string[] = []
let client: QueryClient

beforeAll(() => {
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    requests.push(`${url.pathname}${url.search}`)
  })
  server.listen({ onUnhandledFrame: 'error' })
})

beforeEach(() => {
  requests.length = 0
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  client.clear()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  server.events.removeAllListeners()
})

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

describe('demo HTTP queries and Query cache', () => {
  it('loads each read endpoint through fetch and reuses fresh data on revisits', async () => {
    const [analytics, traffic, orders, customers] = await Promise.all([
      client.query(analyticsQueryOptions()),
      client.query(trafficQueryOptions('14')),
      client.query(ordersQueryOptions()),
      client.query(customersQueryOptions()),
    ])

    expect(analytics.kpis.length).toBeGreaterThan(0)
    expect(traffic.days).toHaveLength(14)
    expect(orders).toEqual(sampleOrders)
    expect(customers.length).toBeGreaterThan(0)
    expect(requests.toSorted()).toEqual([
      '/api/analytics',
      '/api/customers',
      '/api/orders',
      '/api/traffic?period=14',
    ])

    const revisited = await Promise.all([
      client.query(analyticsQueryOptions()),
      client.query(trafficQueryOptions('14')),
      client.query(ordersQueryOptions()),
      client.query(customersQueryOptions()),
    ])
    expect(revisited).toEqual([analytics, traffic, orders, customers])
    expect(requests).toHaveLength(4)
  })

  it('deduplicates simultaneous readers and caches each traffic period independently', async () => {
    const [first, second, monthly] = await Promise.all([
      client.query(trafficQueryOptions('7')),
      client.query(trafficQueryOptions('7')),
      client.query(trafficQueryOptions('30')),
    ])

    expect(second).toBe(first)
    expect(first.days).toHaveLength(7)
    expect(monthly.days).toHaveLength(30)
    expect(monthly.visitors).toBeGreaterThan(first.visitors)
    await client.query(trafficQueryOptions('7'))
    expect(requests.toSorted()).toEqual(['/api/traffic?period=30', '/api/traffic?period=7'])
  })

  it('invalidates all traffic periods by prefix without invalidating orders', async () => {
    await Promise.all([
      client.query(trafficQueryOptions('7')),
      client.query(trafficQueryOptions('30')),
      client.query(ordersQueryOptions()),
    ])

    await client.invalidateQueries({ queryKey: trafficKeys.all })
    await Promise.all([
      client.query(trafficQueryOptions('7')),
      client.query(trafficQueryOptions('30')),
      client.query(ordersQueryOptions()),
    ])

    expect(requests.filter((path) => path === '/api/traffic?period=7')).toHaveLength(2)
    expect(requests.filter((path) => path === '/api/traffic?period=30')).toHaveLength(2)
    expect(requests.filter((path) => path === '/api/orders')).toHaveLength(1)
  })

  it('fetches again when cached data has passed its freshness window', async () => {
    await client.query(ordersQueryOptions())
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_001)
    await client.query(ordersQueryOptions())
    expect(requests).toEqual(['/api/orders', '/api/orders'])
  })

  it('aborts a canceled request and does not cache its late response', async () => {
    const started = deferred<AbortSignal>()
    const release = deferred<undefined>()
    server.use(
      http.get('http://localhost/api/orders', async ({ request }) => {
        started.resolve(request.signal)
        await release.promise
        return HttpResponse.json(sampleOrders)
      }),
    )

    const outcome = client.query(ordersQueryOptions()).catch((error: unknown) => error)
    const requestSignal = await started.promise
    try {
      await client.cancelQueries({ queryKey: orderKeys.all })
      expect(requestSignal.aborted).toBe(true)
      release.resolve(undefined)
      expect(await outcome).toBeInstanceOf(CancelledError)
      expect(client.getQueryData(ordersQueryOptions().queryKey)).toBeUndefined()
    } finally {
      release.resolve(undefined)
    }
  })

  it.each([
    {
      name: 'invalid JSON shape',
      response: () => HttpResponse.json({ orders: [] }),
      code: 'INVALID_RESPONSE',
      status: 200,
    },
    {
      name: 'HTTP failure',
      response: () => new HttpResponse(null, { status: 503 }),
      code: 'HTTP_ERROR',
      status: 503,
    },
  ])('surfaces $name through the real response boundary', async ({ response, code, status }) => {
    server.use(http.get('http://localhost/api/orders', response))

    await expect(client.query(ordersQueryOptions())).rejects.toMatchObject({ code, status })
    expect(client.getQueryData(ordersQueryOptions().queryKey)).toBeUndefined()
  })

  it('rejects unsupported traffic periods at the mock HTTP boundary', async () => {
    const response = await fetch('http://localhost/api/traffic?period=90')
    expect(response.status).toBe(400)
  })

  it('strips unexpected chart styles from traffic responses at the HTTP boundary', async () => {
    const traffic = getSampleTraffic('7')
    server.use(
      http.get('http://localhost/api/traffic', () =>
        HttpResponse.json({
          ...traffic,
          devices: traffic.devices.map((device) => ({
            ...device,
            fill: 'url(https://untrusted.example/tracker.svg)',
          })),
        }),
      ),
    )

    const data = await client.query(trafficQueryOptions('7'))
    expect(data.devices).toEqual(traffic.devices)
    for (const device of data.devices) expect(device).not.toHaveProperty('fill')
  })
})
