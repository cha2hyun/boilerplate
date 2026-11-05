import { z } from 'zod'
import { ApiError, delay } from '@/shared/api'
import { orderInputSchema, orderSchema, ordersSchema, type SampleOrder } from '../model/schema'
import { sampleOrders } from './seed'
import type { OrderAdapter } from './types'

export const ORDER_STORAGE_KEY = 'orbit.demo.orders.v1'
const persistedSchema = z.object({ version: z.literal(1), orders: ordersSchema })
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

interface DemoOptions {
  storage?: StorageAdapter | null
  delayMs?: number
  createId?: () => string
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
  let storage = options.storage === undefined ? browserStorage() : options.storage
  let memory = ordersSchema.parse(sampleOrders)
  const createId = options.createId ?? (() => `ORD-${crypto.randomUUID()}`)
  const latency = options.delayMs ?? 280

  function persist(orders: SampleOrder[]) {
    memory = ordersSchema.parse(orders)
    try {
      storage?.setItem(ORDER_STORAGE_KEY, JSON.stringify({ version: 1, orders: memory }))
    } catch {
      storage = null
    }
  }

  function read(): SampleOrder[] {
    if (!storage) return ordersSchema.parse(memory)
    let raw: string | null
    try {
      raw = storage.getItem(ORDER_STORAGE_KEY)
    } catch {
      storage = null
      return ordersSchema.parse(memory)
    }
    if (raw === null) {
      persist(memory)
      return ordersSchema.parse(memory)
    }
    try {
      const parsed = persistedSchema.safeParse(JSON.parse(raw))
      if (parsed.success) {
        memory = parsed.data.orders
        return ordersSchema.parse(memory)
      }
    } catch {
      // Invalid JSON and schema versions recover to the validated seed.
    }
    persist(ordersSchema.parse(sampleOrders))
    return ordersSchema.parse(memory)
  }

  function notFound(): never {
    throw new ApiError('This order could not be found. Refresh and try again.', 'HTTP_ERROR', 404)
  }

  return {
    async list(signal) {
      await delay(latency, signal)
      return read()
    },
    async create(input, signal) {
      const validated = orderInputSchema.parse(input)
      await delay(latency, signal)
      const orders = read()
      const order = orderSchema.parse({
        ...validated,
        id: createId(),
        customer: { ...validated.customer, initials: initials(validated.customer.name) },
      })
      if (orders.some((item) => item.id === order.id))
        throw new ApiError('This order ID already exists.', 'HTTP_ERROR', 409)
      persist([order, ...orders])
      return order
    },
    async update(id, input, signal) {
      const validated = orderInputSchema.parse(input)
      await delay(latency, signal)
      const orders = read()
      if (!orders.some((order) => order.id === id)) notFound()
      const updated = orderSchema.parse({
        ...validated,
        id,
        customer: { ...validated.customer, initials: initials(validated.customer.name) },
      })
      persist(orders.map((order) => (order.id === id ? updated : order)))
      return updated
    },
    async delete(id, signal) {
      await delay(latency, signal)
      const orders = read()
      if (!orders.some((order) => order.id === id)) notFound()
      persist(orders.filter((order) => order.id !== id))
    },
  }
}
