import { z } from 'zod'
import { ApiError, delay } from '@/shared/api'
import { storageKeys } from '@/shared/config/product'
import { createDemoRecordId } from '@/shared/lib/demo-record-id'
import { customerInputSchema, customerSchema, customersSchema } from '../model/schema'
import type { SampleCustomer } from '../model/schema'
import { sampleCustomers } from './seed'
import type { CustomerAdapter } from './types'

export const CUSTOMER_STORAGE_KEY = storageKeys.demoCustomers
const persistedSchema = z.object({ version: z.literal(1), customers: customersSchema })
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

interface DemoOptions {
  onStorageUnavailable?: () => void
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
    .toUpperCase()
}

/** A browser-only demo repository. Never treat this data as a secure backend. */
export function createDemoCustomerAdapter(options: DemoOptions = {}): CustomerAdapter {
  let storage = options.storage === undefined ? browserStorage() : options.storage
  let memory = customersSchema.parse(sampleCustomers)
  const createId = options.createId ?? (() => createDemoRecordId('cus_'))
  const latency = options.delayMs ?? 280

  let reportedUnavailable = false
  function fallBackToMemory() {
    storage = null
    if (reportedUnavailable) return
    reportedUnavailable = true
    try {
      options.onStorageUnavailable?.()
    } catch {
      // A status observer must not prevent the in-memory fallback.
    }
  }
  if (!storage) fallBackToMemory()

  function persist(customers: SampleCustomer[]) {
    memory = customersSchema.parse(customers)
    try {
      storage?.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({ version: 1, customers: memory }))
    } catch {
      // Restricted storage and quota errors still permit an in-memory demo session.
      fallBackToMemory()
    }
  }

  function read(): SampleCustomer[] {
    if (!storage) return customersSchema.parse(memory)

    let raw: string | null
    try {
      raw = storage.getItem(CUSTOMER_STORAGE_KEY)
    } catch {
      fallBackToMemory()
      return customersSchema.parse(memory)
    }

    if (raw === null) {
      persist(memory)
      return customersSchema.parse(memory)
    }

    try {
      const parsed = persistedSchema.safeParse(JSON.parse(raw))
      if (parsed.success) {
        memory = parsed.data.customers
        return customersSchema.parse(memory)
      }
    } catch {
      // Malformed persisted data is not allowed across the runtime boundary.
    }

    persist(customersSchema.parse(sampleCustomers))
    return customersSchema.parse(memory)
  }

  function notFound(): never {
    throw new ApiError(
      'This customer could not be found. Refresh and try again.',
      'HTTP_ERROR',
      404,
    )
  }

  return {
    async list(signal) {
      await delay(latency, signal)
      return read()
    },
    async create(input, signal) {
      const validated = customerInputSchema.parse(input)
      await delay(latency, signal)
      const customers = read()
      const customer = customerSchema.parse({
        ...validated,
        id: createId(),
        initials: initials(validated.name),
        orders: 0,
        spent: 0,
        lastOrder: null,
      })
      if (customers.some((item) => item.id === customer.id))
        throw new ApiError('This customer ID already exists.', 'HTTP_ERROR', 409)
      persist([customer, ...customers])
      return customer
    },
    async update(id, input, signal) {
      const validated = customerInputSchema.parse(input)
      await delay(latency, signal)
      const customers = read()
      const existing = customers.find((customer) => customer.id === id)
      if (!existing) notFound()
      const updated = customerSchema.parse({
        ...existing,
        ...validated,
        initials: initials(validated.name),
      })
      persist(customers.map((customer) => (customer.id === id ? updated : customer)))
      return updated
    },
    async delete(id, signal) {
      await delay(latency, signal)
      const customers = read()
      if (!customers.some((customer) => customer.id === id)) notFound()
      persist(customers.filter((customer) => customer.id !== id))
    },
  }
}
