import { describe, expect, it } from 'vitest'
import { createDemoCustomerAdapter, CUSTOMER_STORAGE_KEY } from './demo'
import { sampleCustomers } from './seed'

function memoryStorage(initial?: string) {
  const values = new Map<string, string>()
  if (initial !== undefined) values.set(CUSTOMER_STORAGE_KEY, initial)
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

const input = {
  name: 'Launch checklist',
  email: 'lee@example.test',
  status: 'Active' as const,
  city: 'Seoul',
  country: 'South Korea',
  joined: '2026-11-05',
}

describe('persistent demo adapter', () => {
  it('persists create, edit and delete across independent adapter instances', async () => {
    const storage = memoryStorage()
    const firstSession = createDemoCustomerAdapter({
      storage,
      delayMs: 0,
      createId: () => 'cus_test',
    })
    const created = await firstSession.create(input)
    expect(created).toMatchObject({
      ...input,
      id: 'cus_test',
      orders: 0,
      spent: 0,
      lastOrder: null,
    })
    expect(created.initials).toBe('LC')

    const secondSession = createDemoCustomerAdapter({ storage, delayMs: 0 })
    expect(await secondSession.list()).toHaveLength(sampleCustomers.length + 1)
    await secondSession.update(created.id, {
      ...input,
      name: 'Ready to launch',
      status: 'Inactive',
    })

    const thirdSession = createDemoCustomerAdapter({ storage, delayMs: 0 })
    expect(
      (await thirdSession.list()).find((customer) => customer.id === created.id),
    ).toMatchObject({
      name: 'Ready to launch',
      status: 'Inactive',
      orders: 0,
      spent: 0,
      lastOrder: null,
    })
    await thirdSession.delete(created.id)
    expect(await firstSession.list()).toHaveLength(sampleCustomers.length)
    expect((await firstSession.list()).some((customer) => customer.id === created.id)).toBe(false)
  })

  it('updates contact details and initials while retaining readonly purchase history', async () => {
    const adapter = createDemoCustomerAdapter({ storage: null, delayMs: 0 })
    const existing = sampleCustomers[0]
    if (!existing) throw new Error('A customer fixture is required.')
    const updated = await adapter.update(existing.id, {
      ...input,
      name: '김 하늘',
      orders: 999,
      spent: 999,
      lastOrder: null,
    } as typeof input)
    expect(updated).toMatchObject({
      name: '김 하늘',
      initials: '김하',
      orders: existing.orders,
      spent: existing.spent,
      lastOrder: existing.lastOrder,
    })
  })

  it.each([
    '{not json',
    JSON.stringify({ version: 99, customers: [] }),
    JSON.stringify({ version: 1, customers: [{ id: 'broken' }] }),
  ])('recovers corrupt storage without passing malformed data to the UI', async (raw) => {
    const storage = memoryStorage(raw)
    const adapter = createDemoCustomerAdapter({ storage, delayMs: 0 })
    expect(await adapter.list()).toEqual(sampleCustomers)
    expect(JSON.parse(storage.getItem(CUSTOMER_STORAGE_KEY) ?? 'null')).toEqual({
      version: 1,
      customers: sampleCustomers,
    })
  })

  it('preserves an intentionally empty customer list', async () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, customers: [] }))
    expect(await createDemoCustomerAdapter({ storage, delayMs: 0 }).list()).toEqual([])
  })

  it('keeps mutations working when storage is unavailable', async () => {
    const adapter = createDemoCustomerAdapter({
      storage: {
        getItem: () => {
          throw new DOMException('Access denied', 'SecurityError')
        },
        setItem: () => {
          throw new DOMException('Access denied', 'SecurityError')
        },
      },
      delayMs: 0,
      createId: () => 'cus_memory',
    })
    await adapter.create(input)
    expect((await adapter.list()).map((customer) => customer.id)).toContain('cus_memory')
  })

  it('does not lose a mutation when writing to storage exceeds its quota', async () => {
    const adapter = createDemoCustomerAdapter({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        },
      },
      delayMs: 0,
      createId: () => 'cus_quota',
    })
    await adapter.create(input)
    expect((await adapter.list()).map((customer) => customer.id)).toContain('cus_quota')
  })

  it('cancels a delayed mutation before writing any data', async () => {
    const storage = memoryStorage()
    const adapter = createDemoCustomerAdapter({ storage, delayMs: 1000 })
    const controller = new AbortController()
    const pending = adapter.create(input, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(storage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })

  it('returns a typed 404 for editing or deleting a missing customer', async () => {
    const adapter = createDemoCustomerAdapter({ storage: null, delayMs: 0 })
    await expect(adapter.update('missing', input)).rejects.toMatchObject({ status: 404 })
    await expect(adapter.delete('missing')).rejects.toMatchObject({ status: 404 })
  })

  it('validates input before changing persistent data', async () => {
    const storage = memoryStorage()
    const adapter = createDemoCustomerAdapter({ storage, delayMs: 0 })
    await expect(adapter.create({ ...input, name: ' ' })).rejects.toThrow()
    expect(storage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })
})
