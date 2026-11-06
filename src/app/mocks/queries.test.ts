// @vitest-environment node
import { CancelledError, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsQueryOptions } from '@/entities/analytics'
import { createDemoCustomerAdapter, customersQueryOptions } from '@/entities/customer'
import {
  createDemoOrderAdapter,
  orderKeys,
  ordersQueryOptions,
  orderDetailQueryOptions,
  orderSummaryQueryOptions,
  orderListDefaults,
  sampleOrders,
} from '@/entities/order'
import { getSampleTraffic, trafficKeys, trafficQueryOptions } from '@/entities/traffic'
import { createDemoHandlers } from './handlers'

vi.mock('@/shared/config', () => ({
  env: { dataSource: 'demo', apiBaseUrl: 'http://localhost/api/' },
}))

const server = setupServer()
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
  server.resetHandlers(
    ...createDemoHandlers({
      orders: createDemoOrderAdapter({ storage: null, delayMs: 0 }),
      customers: createDemoCustomerAdapter({ storage: null, delayMs: 0 }),
      delayMs: 0,
    }),
  )
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

const orderListPath = '/api/orders?q=&status=all&sort=newest&page=1&pageSize=6'
const firstOrderPage = { items: sampleOrders.slice(0, 6), total: 12, page: 1, pageSize: 6 }

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
    expect(orders).toEqual(firstOrderPage)
    expect(customers.length).toBeGreaterThan(0)
    expect(requests.toSorted()).toEqual([
      '/api/analytics',
      '/api/customers',
      orderListPath,
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
    expect(requests.filter((path) => path === orderListPath)).toHaveLength(1)
  })

  it('fetches again when cached data has passed its freshness window', async () => {
    await client.query(ordersQueryOptions())
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_001)
    await client.query(ordersQueryOptions())
    expect(requests).toEqual([orderListPath, orderListPath])
  })

  it('aborts a canceled request and does not cache its late response', async () => {
    const started = deferred<AbortSignal>()
    const release = deferred<undefined>()
    server.use(
      http.get('http://localhost/api/orders', async ({ request }) => {
        started.resolve(request.signal)
        await release.promise
        return HttpResponse.json(firstOrderPage)
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

const commerceInputs = [
  {
    endpoint: 'orders',
    input: {
      customer: { name: 'Demo Buyer', email: 'buyer@example.com' },
      date: '2026-11-05',
      status: 'Processing',
      payment: 'Pending',
      city: 'Seoul',
      country: 'South Korea',
      shipping: 500,
      items: [{ name: 'Notebook', quantity: 2, unitPrice: 1250 }],
    },
    update: { city: 'Busan' },
  },
  {
    endpoint: 'customers',
    input: {
      name: 'Demo Buyer',
      email: 'buyer@example.com',
      status: 'Active',
      city: 'Seoul',
      country: 'South Korea',
      joined: '2026-11-05',
    },
    update: { city: 'Busan' },
  },
] as const

async function sendJson(path: string, method: string, body?: unknown) {
  return fetch(`http://localhost/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

describe('demo commerce HTTP mutations', () => {
  it.each(commerceInputs)(
    'keeps $endpoint ID collisions as HTTP 409 without changing saved data',
    async ({ endpoint, input }) => {
      server.use(
        ...createDemoHandlers({
          orders: createDemoOrderAdapter({
            storage: null,
            delayMs: 0,
            createId: () => 'duplicate-id',
          }),
          customers: createDemoCustomerAdapter({
            storage: null,
            delayMs: 0,
            createId: () => 'duplicate-id',
          }),
          delayMs: 0,
        }),
      )
      expect((await sendJson(endpoint, 'POST', input)).status).toBe(201)
      const before: unknown = await (await sendJson(endpoint, 'GET')).json()
      const rejected = await sendJson(endpoint, 'POST', input)
      expect(rejected.status).toBe(409)
      expect(await rejected.json()).toEqual({ message: 'The record already exists.' })
      expect(await (await sendJson(endpoint, 'GET')).json()).toEqual(before)
    },
  )

  it.each(commerceInputs)(
    'creates, updates, reads and deletes $endpoint through HTTP',
    async ({ endpoint, input, update }) => {
      const createdResponse = await sendJson(endpoint, 'POST', {
        ...input,
        id: 'untrusted-id',
        orders: 999,
        spent: 999999,
      })
      expect(createdResponse.status).toBe(201)
      expect(createdResponse.headers.get('cache-control')).toBe('no-store')
      const created = (await createdResponse.json()) as { id: string }
      expect(created).toMatchObject(input)
      expect(created.id).not.toBe('untrusted-id')
      if (endpoint === 'customers') {
        expect(created).toMatchObject({ orders: 0, spent: 0, lastOrder: null })
      }

      const updatedResponse = await sendJson(`${endpoint}/${created.id}`, 'PATCH', {
        ...input,
        ...update,
      })
      expect(updatedResponse.status).toBe(200)
      expect(await updatedResponse.json()).toMatchObject({ id: created.id, ...update })
      const payload: unknown = await (
        await sendJson(endpoint === 'orders' ? `${endpoint}?pageSize=24` : endpoint, 'GET')
      ).json()
      const records = (
        endpoint === 'orders' ? (payload as { items: { id: string }[] }).items : payload
      ) as { id: string }[]
      expect(records.find(({ id }) => id === created.id)).toMatchObject(update)
      expect(records).toHaveLength(13)

      const removed = await sendJson(`${endpoint}/${created.id}`, 'DELETE')
      expect(removed.status).toBe(204)
      expect(await removed.text()).toBe('')
      const remaining: unknown = await (await sendJson(endpoint, 'GET')).json()
      if (endpoint === 'orders') expect(remaining).toMatchObject({ total: 12 })
      else expect(remaining).toHaveLength(12)
      expect((await sendJson(`${endpoint}/${created.id}`, 'PATCH', input)).status).toBe(404)
      expect((await sendJson(`${endpoint}/${created.id}`, 'DELETE')).status).toBe(404)
    },
  )

  it.each(commerceInputs)(
    'rejects malformed or incomplete $endpoint writes without changing data',
    async ({ endpoint }) => {
      const before: unknown = await (await sendJson(endpoint, 'GET')).json()
      expect((await sendJson(endpoint, 'POST', {})).status).toBe(400)
      expect((await sendJson(`${endpoint}/missing`, 'PATCH', {})).status).toBe(400)
      const malformed = await fetch(`http://localhost/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })
      expect(malformed.status).toBe(400)
      expect(await (await sendJson(endpoint, 'GET')).json()).toEqual(before)
    },
  )
})

describe('server order query contracts', () => {
  it('keeps filters and pages in separate keys while detail and summary remain independent', async () => {
    const first = await client.query(ordersQueryOptions())
    const secondParams = { ...orderListDefaults, page: 2 }
    const second = await client.query(ordersQueryOptions(secondParams))
    const filteredParams = {
      ...orderListDefaults,
      q: 'olivia@example.com',
      status: 'Processing' as const,
    }
    const filtered = await client.query(ordersQueryOptions(filteredParams))
    const detail = await client.query(orderDetailQueryOptions('ORD-1042'))
    const summary = await client.query(orderSummaryQueryOptions())
    expect(first.items).toHaveLength(6)
    expect(second.items).toHaveLength(6)
    expect(second.items.some((order) => order.id === 'ORD-1042')).toBe(false)
    expect(detail?.id).toBe('ORD-1042')
    expect(filtered).toMatchObject({ total: 1, page: 1 })
    expect(summary.total).toBe(12)
    const count = requests.length
    await client.query(ordersQueryOptions(secondParams))
    expect(requests).toHaveLength(count)
    await expect(client.query(orderDetailQueryOptions('missing-order'))).resolves.toBeNull()
  })
  it('allows a stored order named summary without intercepting the aggregate endpoint', async () => {
    const fixture = { ...sampleOrders[0], id: 'summary' }
    server.use(
      ...createDemoHandlers({
        orders: createDemoOrderAdapter({
          storage: {
            getItem: () => JSON.stringify({ version: 1, orders: [fixture] }),
            setItem: () => undefined,
          },
          delayMs: 0,
        }),
        delayMs: 0,
      }),
    )
    expect((await client.query(orderDetailQueryOptions('summary')))?.id).toBe('summary')
    expect((await client.query(orderSummaryQueryOptions())).total).toBe(1)
  })
  it('rejects invalid query input at HTTP and returns a clamped page after deletion', async () => {
    for (const search of ['page=-1', 'page=2.5', 'pageSize=500', 'sort=unknown', 'status=unknown'])
      expect((await fetch(`http://localhost/api/orders?${search}`)).status).toBe(400)
    const lastPage = await client.query(ordersQueryOptions({ ...orderListDefaults, page: 999 }))
    expect(lastPage).toMatchObject({ page: 2, total: 12 })
    for (const order of lastPage.items) await sendJson(`orders/${order.id}`, 'DELETE')
    await client.invalidateQueries({ queryKey: orderKeys.all })
    const corrected = await client.query(ordersQueryOptions({ ...orderListDefaults, page: 2 }))
    expect(corrected).toMatchObject({ page: 1, total: 6 })
    expect(corrected.items).toHaveLength(6)
  })
})
