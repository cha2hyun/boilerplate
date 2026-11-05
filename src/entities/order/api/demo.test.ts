import { describe, expect, it } from 'vitest'
import { orderInputSchema } from '../model/schema'
import { createDemoOrderAdapter, ORDER_STORAGE_KEY } from './demo'
import { sampleOrders } from './seed'

const input = orderInputSchema.parse(sampleOrders[0])
function memoryStorage(initial?: string) {
  const values = new Map<string, string>()
  if (initial !== undefined) values.set(ORDER_STORAGE_KEY, initial)
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('persistent demo orders', () => {
  it('persists CRUD across instances and derives initials from the edited snapshot', async () => {
    const storage = memoryStorage()
    const first = createDemoOrderAdapter({ storage, delayMs: 0, createId: () => 'ORD-test' })
    const created = await first.create({
      ...input,
      customer: { name: 'Sam Lee', email: 'sam@example.com' },
    })
    expect(created.customer.initials).toBe('SL')
    const second = createDemoOrderAdapter({ storage, delayMs: 0 })
    expect(await second.list()).toHaveLength(sampleOrders.length + 1)
    const updated = await second.update(created.id, {
      ...input,
      status: 'Cancelled',
      customer: { name: 'Anna Park', email: 'anna@example.com' },
    })
    expect(updated.customer).toEqual({
      name: 'Anna Park',
      email: 'anna@example.com',
      initials: 'AP',
    })
    expect((await first.list()).find((order) => order.id === created.id)).toEqual(updated)
    await first.delete(created.id)
    expect(await second.list()).toEqual(sampleOrders)
  })

  it.each([
    '{invalid',
    JSON.stringify({ version: 99, orders: [] }),
    JSON.stringify({ version: 1, orders: [{ id: 'invalid' }] }),
  ])('repairs malformed storage %s', async (raw) => {
    const storage = memoryStorage(raw)
    expect(await createDemoOrderAdapter({ storage, delayMs: 0 }).list()).toEqual(sampleOrders)
    expect(JSON.parse(storage.getItem(ORDER_STORAGE_KEY) ?? 'null')).toEqual({
      version: 1,
      orders: sampleOrders,
    })
  })

  it('preserves a valid empty stored list', async () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, orders: [] }))
    expect(await createDemoOrderAdapter({ storage, delayMs: 0 }).list()).toEqual([])
  })

  it.each(['read', 'write'] as const)(
    'keeps a memory session after storage %s fails',
    async (failure) => {
      const storage = {
        getItem: () => {
          if (failure === 'read') throw new Error('Storage unavailable')
          return null
        },
        setItem: () => {
          throw new Error('Storage unavailable')
        },
      }
      const adapter = createDemoOrderAdapter({ storage, delayMs: 0, createId: () => 'ORD-memory' })
      await adapter.create(input)
      expect((await adapter.list()).some((order) => order.id === 'ORD-memory')).toBe(true)
    },
  )

  it('returns 404 for missing rows and rejects invalid input before changing storage', async () => {
    const storage = memoryStorage()
    const adapter = createDemoOrderAdapter({ storage, delayMs: 0 })
    await expect(adapter.create({ ...input, items: [] })).rejects.toThrow()
    expect(storage.getItem(ORDER_STORAGE_KEY)).toBeNull()
    await expect(adapter.update('missing', input)).rejects.toMatchObject({ status: 404 })
    await expect(adapter.delete('missing')).rejects.toMatchObject({ status: 404 })
  })

  it('cancels a delayed write before touching persistent data', async () => {
    const storage = memoryStorage()
    const adapter = createDemoOrderAdapter({ storage, delayMs: 1000 })
    const controller = new AbortController()
    const pending = adapter.create(input, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(storage.getItem(ORDER_STORAGE_KEY)).toBeNull()
  })

  it('returns detached records so callers cannot mutate the repository', async () => {
    const adapter = createDemoOrderAdapter({ storage: null, delayMs: 0 })
    const records = await adapter.list()
    const first = records[0]
    if (!first) throw new Error('Expected an order fixture')
    first.customer.name = 'Changed outside repository'
    expect(await adapter.list()).toEqual(sampleOrders)
  })
})
