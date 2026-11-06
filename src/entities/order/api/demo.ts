import { z } from 'zod'
import { ApiError, delay } from '@/shared/api'
import { storageKeys } from '@/shared/config/product'
import { createDemoRecordId } from '@/shared/lib/demo-record-id'
import {
  orderInputSchema,
  orderSchema,
  ordersSchema,
  orderLimits,
  orderListParamsSchema,
  orderListDefaults,
  type SampleOrder,
  type OrderHistoryEntry,
} from '../model/schema'
import { sampleOrders } from './seed'
import { pageOrders, summarizeOrders } from '../model/list'
import type { OrderAdapter } from './types'
import { withOrderStorageLock } from './storage-lock'

export const ORDER_STORAGE_KEY = storageKeys.demoOrders
const persistedSchema = z.object({ version: z.literal(1), orders: ordersSchema })
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

interface DemoOptions {
  storage?: StorageAdapter | null
  delayMs?: number
  createId?: () => string
  now?: () => Date
  onStorageUnavailable?: () => void
}

function browserStorage(): StorageAdapter | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function initials(name: string) {
  return name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase()
    .slice(0, 3)
}

/** Browser demo storage; customer information is an independent order snapshot. */
export function createDemoOrderAdapter(options: DemoOptions = {}): OrderAdapter {
  const sharedStorage = browserStorage()
  let storage = options.storage === undefined ? sharedStorage : options.storage
  let notified = false
  function fallBackToMemory() {
    storage = null
    if (!notified) {
      notified = true
      options.onStorageUnavailable?.()
    }
  }
  if (!storage) fallBackToMemory()
  let memory = ordersSchema.parse(sampleOrders)
  const createId = options.createId ?? (() => createDemoRecordId('ORD-'))
  const now = options.now ?? (() => new Date())
  const latency = options.delayMs ?? 280

  function persist(orders: SampleOrder[]) {
    memory = ordersSchema.parse(orders)
    try {
      storage?.setItem(ORDER_STORAGE_KEY, JSON.stringify({ version: 1, orders: memory }))
    } catch {
      fallBackToMemory()
    }
  }

  function read(repair = true): SampleOrder[] {
    if (!storage) return ordersSchema.parse(memory)
    let raw: string | null
    try {
      raw = storage.getItem(ORDER_STORAGE_KEY)
    } catch {
      fallBackToMemory()
      return ordersSchema.parse(memory)
    }
    if (raw === null) {
      if (repair) persist(memory)
      return ordersSchema.parse(memory)
    }
    try {
      const parsed = persistedSchema.safeParse(JSON.parse(raw))
      if (parsed.success) {
        memory = parsed.data.orders.map((order) => ({ ...order, revision: order.revision ?? 1 }))
        return ordersSchema.parse(memory)
      }
    } catch {
      // Invalid JSON and schema versions recover to the validated seed.
    }
    memory = ordersSchema.parse(sampleOrders)
    if (repair) persist(memory)
    return ordersSchema.parse(memory)
  }

  function notFound(): never {
    throw new ApiError('This order could not be found. Refresh and try again.', 'HTTP_ERROR', 404)
  }

  async function access<T>(signal: AbortSignal | undefined, action: () => T) {
    await delay(latency, signal)
    if (!storage || storage !== sharedStorage) return action()
    return withOrderStorageLock((shared) => {
      signal?.throwIfAborted()
      if (!shared && storage) {
        read(false)
        fallBackToMemory()
      }
      return action()
    })
  }

  return {
    async list(params = orderListDefaults, signal) {
      const validated = orderListParamsSchema.parse(params)
      return access(signal, () => pageOrders(read(), validated))
    },
    async detail(id, signal) {
      return access(signal, () => read().find((order) => order.id === id) ?? notFound())
    },
    async summary(signal) {
      return access(signal, () => summarizeOrders(read()))
    },
    async create(input, signal) {
      const validated = orderInputSchema.parse(input)
      return access(signal, () => {
        const orders = read()
        const id = createId()
        if (orders.some((item) => item.id === id))
          throw new ApiError('This order ID already exists.', 'HTTP_ERROR', 409)
        const occurredAt = now().toISOString()
        const order = orderSchema.parse({
          ...validated,
          id,
          revision: 1,
          history: [
            { field: 'status', occurredAt, from: null, to: validated.status },
            { field: 'payment', occurredAt, from: null, to: validated.payment },
          ],
          customer: { ...validated.customer, initials: initials(validated.customer.name) },
        })
        persist([order, ...orders])
        return order
      })
    },
    async update(id, input, revision, signal) {
      const validated = orderInputSchema.parse(input)
      return access(signal, () => {
        const orders = read()
        const existing = orders.find((order) => order.id === id)
        if (!existing) notFound()
        if (revision === undefined)
          throw new ApiError('An order revision is required.', 'HTTP_ERROR', 428)
        if (revision !== existing.revision)
          throw new ApiError('The order has changed.', 'HTTP_ERROR', 412)
        const changes: OrderHistoryEntry[] = []
        if (existing.status !== validated.status || existing.payment !== validated.payment) {
          const occurredAt = now().toISOString()
          if (existing.status !== validated.status)
            changes.push({
              field: 'status',
              occurredAt,
              from: existing.status,
              to: validated.status,
            })
          if (existing.payment !== validated.payment)
            changes.push({
              field: 'payment',
              occurredAt,
              from: existing.payment,
              to: validated.payment,
            })
        }
        const updated = orderSchema.parse({
          ...validated,
          id,
          revision: revision + 1,
          history: [...existing.history, ...changes].slice(-orderLimits.history),
          customer: {
            ...validated.customer,
            initials: initials(validated.customer.name),
            ...(existing.customer.email === validated.customer.email && existing.customer.avatarUrl
              ? { avatarUrl: existing.customer.avatarUrl }
              : {}),
          },
        })
        persist(orders.map((order) => (order.id === id ? updated : order)))
        return updated
      })
    },
    async delete(id, signal) {
      return access(signal, () => {
        const orders = read()
        if (!orders.some((order) => order.id === id)) notFound()
        persist(orders.filter((order) => order.id !== id))
      })
    },
  }
}
