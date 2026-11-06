import { afterEach, describe, expect, it, vi } from 'vitest'
import { orderInputSchema, orderSchema, orderListDefaults } from '../model/schema'
import { httpOrderAdapter } from './http'
import { sampleOrders } from './seed'

vi.mock('@/shared/config', () => ({
  env: { dataSource: 'api', apiBaseUrl: 'https://api.example.test/v1/' },
}))
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('order HTTP contract', () => {
  it('validates request bodies, encodes IDs, reads server responses, and accepts 204 deletion', async () => {
    const order = orderSchema.parse({ ...sampleOrders[0], id: 'ORD /한글?#%' })
    const input = { ...order, city: ' Seoul ' }
    const body = orderInputSchema.parse(input)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [order], total: 1, page: 1, pageSize: 6 }))
      .mockResolvedValueOnce(Response.json(order, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ ...order, revision: 2 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await httpOrderAdapter.list()).items).toEqual([order])
    expect(await httpOrderAdapter.create(input)).toEqual(order)
    expect(await httpOrderAdapter.update(order.id, input, order.revision)).toEqual({
      ...order,
      revision: 2,
    })
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('If-Match')).toBe('"1"')
    await httpOrderAdapter.delete(order.id)
    const collection = 'https://api.example.test/v1/orders'
    expect(
      fetchMock.mock.calls.map(([url, options]) => ({
        url,
        method: options?.method ?? 'GET',
        body: options?.body,
      })),
    ).toEqual([
      {
        url: `${collection}?q=&status=all&sort=newest&page=1&pageSize=6`,
        method: 'GET',
        body: undefined,
      },
      { url: collection, method: 'POST', body: JSON.stringify(body) },
      {
        url: `${collection}/${encodeURIComponent(order.id)}`,
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      { url: `${collection}/${encodeURIComponent(order.id)}`, method: 'DELETE', body: undefined },
    ])
  })

  it('rejects invalid successful write responses as an uncertain mutation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 'incomplete' })),
    )
    await expect(
      httpOrderAdapter.create(orderInputSchema.parse(sampleOrders[0])),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE', mayHaveSucceeded: true })
  })

  it('rejects duplicate identities at the HTTP list boundary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          items: [sampleOrders[0], sampleOrders[0]],
          total: 2,
          page: 1,
          pageSize: 6,
        }),
      ),
    )
    await expect(httpOrderAdapter.list()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 200,
      mayHaveSucceeded: false,
    })
  })

  it('accepts an older server without history and strips client-supplied history from writes', async () => {
    const { history, ...legacy } = orderSchema.parse(sampleOrders[0])
    expect(history).toEqual([])
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(legacy))
    vi.stubGlobal('fetch', fetchMock)
    const untrustedInput = { ...legacy, history: [] }
    const created = await httpOrderAdapter.create(untrustedInput)
    expect(created.history).toEqual([])
    const body = fetchMock.mock.calls[0]?.[1]?.body
    if (typeof body !== 'string') throw new Error('Expected a serialized JSON request body.')
    expect(JSON.parse(body)).not.toHaveProperty('history')
  })

  it('keeps unversioned API orders readable and refuses a blind edit', async () => {
    const { revision, ...legacy } = orderSchema.parse(sampleOrders[0])
    expect(revision).toBe(1)
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json(legacy))
    vi.stubGlobal('fetch', fetch)
    const record = await httpOrderAdapter.detail(legacy.id)
    expect(record.revision).toBeUndefined()
    await expect(
      httpOrderAdapter.update(record.id, orderInputSchema.parse(record), record.revision),
    ).rejects.toMatchObject({ status: 428 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('treats a successful PATCH without a newer revision as uncertain', async () => {
    const record = orderSchema.parse(sampleOrders[0])
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(record)))
    await expect(
      httpOrderAdapter.update(record.id, orderInputSchema.parse(record), record.revision),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE', mayHaveSucceeded: true })
  })

  it('aborts an in-flight HTTP list using the Query-provided signal', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Aborted', 'AbortError'))
              },
              { once: true },
            )
          }),
      ),
    )
    const pending = httpOrderAdapter.list(orderListDefaults, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})

it.each(['.', '..', ''])(
  'rejects unsafe path ID %j without issuing a read, PATCH or DELETE',
  async (id) => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    await expect(httpOrderAdapter.detail(id)).rejects.toMatchObject({
      status: 400,
      mayHaveSucceeded: false,
    })
    await expect(
      httpOrderAdapter.update(id, orderInputSchema.parse(sampleOrders[0]), 1),
    ).rejects.toMatchObject({ status: 400, mayHaveSucceeded: false })
    await expect(httpOrderAdapter.delete(id)).rejects.toMatchObject({
      status: 400,
      mayHaveSucceeded: false,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  },
)

it('treats mismatched detail IDs as invalid and a mismatched PATCH response as uncertain', async () => {
  const order = orderSchema.parse(sampleOrders[0])
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ ...order, id: 'different' }))),
  )
  await expect(httpOrderAdapter.detail(order.id)).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
    mayHaveSucceeded: false,
  })
  await expect(
    httpOrderAdapter.update(order.id, orderInputSchema.parse(order), order.revision),
  ).rejects.toMatchObject({ code: 'INVALID_RESPONSE', mayHaveSucceeded: true })
})
