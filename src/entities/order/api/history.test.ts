import { describe, expect, it } from 'vitest'
import { orderInputSchema, orderLimits, orderSchema } from '../model/schema'
import { createDemoOrderAdapter } from './demo'
import { sampleOrders } from './seed'

const input = orderInputSchema.parse(sampleOrders[0])
function memoryStorage(initial?: string) {
  let value = initial ?? null
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
  }
}

describe('demo order change history', () => {
  it('records creation and applied status/payment changes across adapter instances', async () => {
    const storage = memoryStorage()
    let timestamp = '2026-11-05T10:00:00.000Z'
    const adapter = createDemoOrderAdapter({
      storage,
      delayMs: 0,
      createId: () => 'ORD-history',
      now: () => new Date(timestamp),
    })
    const created = await adapter.create(input)
    expect(created.history).toEqual([
      { field: 'status', occurredAt: timestamp, from: null, to: input.status },
      { field: 'payment', occurredAt: timestamp, from: null, to: input.payment },
    ])
    timestamp = '2026-11-05T10:01:00.000Z'
    const updated = await adapter.update(created.id, {
      ...input,
      status: 'Shipped',
      payment: 'Refunded',
    })
    expect(updated.history).toEqual([
      ...created.history,
      { field: 'status', occurredAt: timestamp, from: input.status, to: 'Shipped' },
      { field: 'payment', occurredAt: timestamp, from: input.payment, to: 'Refunded' },
    ])
    const reopened = createDemoOrderAdapter({ storage, delayMs: 0 })
    expect((await reopened.detail(created.id)).history).toEqual(updated.history)

    const edited = await reopened.update(created.id, {
      ...orderInputSchema.parse(updated),
      city: 'Busan',
    })
    expect(edited.history).toEqual(updated.history)
    expect((await reopened.update(created.id, orderInputSchema.parse(edited))).history).toEqual(
      updated.history,
    )
  })

  it('starts legacy records with no history and records only changes made now', async () => {
    const { history, ...legacy } = orderSchema.parse(sampleOrders[0])
    expect(history).toEqual([])
    expect(sampleOrders.every((order) => order.history.length === 0)).toBe(true)
    const storage = memoryStorage(JSON.stringify({ version: 1, orders: [legacy] }))
    const occurredAt = '2026-11-05T12:00:00.000Z'
    const adapter = createDemoOrderAdapter({ storage, delayMs: 0, now: () => new Date(occurredAt) })
    expect((await adapter.list()).items).toEqual([{ ...legacy, history: [] }])
    const updated = await adapter.update(legacy.id, { ...input, status: 'Shipped' })
    expect(updated.history).toEqual([
      { field: 'status', occurredAt, from: 'Processing', to: 'Shipped' },
    ])
    expect(JSON.parse(storage.getItem() ?? 'null')).toMatchObject({
      version: 1,
      orders: [{ id: legacy.id, history: updated.history }],
    })
  })

  it('does not append history for invalid, missing, or canceled writes', async () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, orders: sampleOrders }))
    const adapter = createDemoOrderAdapter({ storage, delayMs: 0 })
    const existing = orderSchema.parse(sampleOrders[0])
    const before = storage.getItem()
    await expect(
      adapter.update(existing.id, { ...input, status: 'Shipped', items: [] }),
    ).rejects.toThrow()
    await expect(adapter.update('missing', { ...input, status: 'Shipped' })).rejects.toMatchObject({
      status: 404,
    })
    expect(storage.getItem()).toBe(before)
    const delayed = createDemoOrderAdapter({ storage, delayMs: 1000 })
    const controller = new AbortController()
    const pending = delayed.update(existing.id, { ...input, status: 'Shipped' }, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(storage.getItem()).toBe(before)
  })

  it('retains the latest bounded entries without inventing transition restrictions', async () => {
    let tick = 0
    const adapter = createDemoOrderAdapter({
      storage: null,
      delayMs: 0,
      createId: () => 'ORD-bounded',
      now: () => new Date(Date.UTC(2026, 10, 5, 0, 0, tick++)),
    })
    let current = await adapter.create(input)
    for (let index = 0; index < orderLimits.history + 1; index += 1) {
      current = await adapter.update(current.id, {
        ...input,
        status: index % 2 === 0 ? 'Cancelled' : 'Delivered',
      })
    }
    expect(current.history).toHaveLength(orderLimits.history)
    expect(current.history[0]).toEqual({
      field: 'status',
      occurredAt: '2026-11-05T00:00:02.000Z',
      from: 'Cancelled',
      to: 'Delivered',
    })
    expect(current.history.at(-1)).toMatchObject({
      field: 'status',
      from: 'Delivered',
      to: 'Cancelled',
    })
    expect((await adapter.detail(current.id)).history).toEqual(current.history)
  })

  it('ignores submitted history and keeps session history when persistence is unavailable', async () => {
    const adapter = createDemoOrderAdapter({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('Unavailable')
        },
      },
      delayMs: 0,
      createId: () => 'ORD-session',
      now: () => new Date('2026-11-05T10:00:00.000Z'),
    })
    const injected = {
      ...input,
      history: [{ field: 'status', from: 'Delivered', to: 'Cancelled' }],
    }
    const created = await adapter.create(injected)
    expect(created.history).toHaveLength(2)
    expect(created.history.every((event) => event.from === null)).toBe(true)
    const updated = await adapter.update(created.id, { ...injected, status: 'Shipped' })
    expect(updated.history).toHaveLength(3)
    expect((await adapter.detail(created.id)).history).toEqual(updated.history)
  })
})
