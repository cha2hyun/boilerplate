import { describe, expect, it } from 'vitest'
import { storageKeys } from '@/shared/config/product'
import { createPreferenceStorage } from '@/shared/lib/preference-storage'
import { createTableViewStore } from './store'
import { tableViewStateSchema, type TableViewState } from './view-state'

function createView(overrides: Partial<TableViewState> = {}): TableViewState {
  return tableViewStateSchema.parse({
    density: 'default',
    columnOrder: ['id', 'customer', 'total', 'actions'],
    columnSizing: {},
    columnVisibility: {},
    columnPinning: { left: ['id'], right: ['actions'] },
    ...overrides,
  })
}

function createStorage(initial?: string) {
  const memory = new Map<string, string>()
  if (initial !== undefined) memory.set(storageKeys.tableViews, initial)
  return {
    getItem: (name: string) => memory.get(name) ?? null,
    setItem: (name: string, value: string) => {
      memory.set(name, value)
    },
    removeItem: (name: string) => {
      memory.delete(name)
    },
  }
}

describe('table view persistence', () => {
  it('restores each table independently and resets only the requested table', () => {
    const storage = createStorage()
    const first = createTableViewStore(createPreferenceStorage(storage))
    const projects = createView({ density: 'compact', columnVisibility: { customer: false } })
    const orders = createView({ density: 'comfortable', columnSizing: { total: 248 } })
    const customers = createView({ columnOrder: ['customer', 'id', 'total', 'actions'] })
    first.getState().save('projects', projects)
    first.getState().save('orders', orders)
    first.getState().save('customers', customers)

    const restored = createTableViewStore(createPreferenceStorage(storage))
    expect(restored.getState().views).toEqual({ projects, orders, customers })
    restored.getState().reset('orders')

    const afterReset = createTableViewStore(createPreferenceStorage(storage))
    expect(afterReset.getState().views).toEqual({ projects, customers })
    expect(JSON.parse(storage.getItem(storageKeys.tableViews) ?? 'null')).toEqual({
      state: { views: { projects, customers } },
      version: 1,
    })
  })

  it.each([
    ['malformed JSON', '{not json'],
    ['invalid root state', JSON.stringify({ state: { views: null }, version: 1 })],
    [
      'unsupported version',
      JSON.stringify({ state: { views: { orders: createView() } }, version: 99 }),
    ],
  ])('recovers from %s and accepts a subsequent valid change', (_name, raw) => {
    const storage = createStorage(raw)
    const store = createTableViewStore(createPreferenceStorage(storage))
    expect(store.getState().views).toEqual({})

    const orders = createView({ density: 'compact' })
    store.getState().save('orders', orders)
    expect(createTableViewStore(createPreferenceStorage(storage)).getState().views).toEqual({
      orders,
    })
  })

  it('discards one corrupt table without discarding valid preferences for other tables', () => {
    const projects = createView({ density: 'compact' })
    const customers = createView({ columnVisibility: { total: false } })
    const storage = createStorage(
      JSON.stringify({
        version: 1,
        state: {
          views: {
            projects,
            orders: { ...createView(), columnSizing: { total: 'wide' } },
            customers,
          },
        },
      }),
    )
    const restored = createTableViewStore(createPreferenceStorage(storage))
    expect(restored.getState().views.projects).toEqual(projects)
    expect(restored.getState().views.orders).toBeUndefined()
    expect(restored.getState().views.customers).toEqual(customers)
  })

  it('rejects invalid updates before changing memory or persisted preferences', () => {
    const storage = createStorage()
    const store = createTableViewStore(createPreferenceStorage(storage))
    const initial = createView()
    store.getState().save('orders', initial)
    const persisted = storage.getItem(storageKeys.tableViews)

    expect(() => {
      store.getState().save('orders', { ...initial, columnSizing: { total: Number.NaN } })
    }).toThrow()
    expect(store.getState().views.orders).toEqual(initial)
    expect(storage.getItem(storageKeys.tableViews)).toBe(persisted)
  })

  it('keeps the latest table choices and reset in the session after a quota failure', () => {
    const original = createView()
    const storage = createStorage(
      JSON.stringify({ state: { views: { orders: original } }, version: 1 }),
    )
    const fallback = createPreferenceStorage({
      ...storage,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      },
    })
    const store = createTableViewStore(fallback)
    const updated = createView({ density: 'comfortable', columnSizing: { total: 320 } })
    const projects = createView({ density: 'compact' })
    expect(() => {
      store.getState().save('orders', updated)
      store.getState().save('projects', projects)
    }).not.toThrow()
    expect(createTableViewStore(fallback).getState().views).toEqual({ orders: updated, projects })

    store.getState().reset('orders')
    expect(createTableViewStore(fallback).getState().views).toEqual({ projects })
    expect(JSON.parse(storage.getItem(storageKeys.tableViews) ?? 'null')).toEqual({
      state: { views: { orders: original } },
      version: 1,
    })
  })

  it('supports table customization when browser storage access is denied', () => {
    const fallback = createPreferenceStorage({
      getItem: () => {
        throw new DOMException('Access denied', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('Access denied', 'SecurityError')
      },
      removeItem: () => {
        throw new DOMException('Access denied', 'SecurityError')
      },
    })
    const store = createTableViewStore(fallback)
    const orders = createView({ density: 'compact' })
    expect(() => {
      store.getState().save('orders', orders)
    }).not.toThrow()
    expect(createTableViewStore(fallback).getState().views.orders).toEqual(orders)
  })
})
