import { afterEach, describe, expect, it, vi } from 'vitest'
import { orderInputSchema, orderSchema } from '../model/schema'
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
      .mockResolvedValueOnce(Response.json([order]))
      .mockResolvedValueOnce(Response.json(order, { status: 201 }))
      .mockResolvedValueOnce(Response.json(order))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await httpOrderAdapter.list()).toEqual([order])
    expect(await httpOrderAdapter.create(input)).toEqual(order)
    expect(await httpOrderAdapter.update(order.id, input)).toEqual(order)
    await httpOrderAdapter.delete(order.id)
    const collection = 'https://api.example.test/v1/orders'
    expect(
      fetchMock.mock.calls.map(([url, options]) => ({
        url,
        method: options?.method ?? 'GET',
        body: options?.body,
      })),
    ).toEqual([
      { url: collection, method: 'GET', body: undefined },
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
    const pending = httpOrderAdapter.list(controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
