import type { PropsWithChildren } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { orderInputSchema, orderSchema } from '../model/schema'
import {
  orderKeys,
  ordersQueryOptions,
  useCreateOrder,
  useDeleteOrder,
  useUpdateOrder,
} from './queries'
import { sampleOrders } from './seed'

vi.mock('@/shared/config', () => ({ env: { dataSource: 'api', apiBaseUrl: '/api' } }))

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('order mutation cache reconciliation', () => {
  it.each([
    { operation: 'create', uncertain: false },
    { operation: 'update', uncertain: false },
    { operation: 'delete', uncertain: false },
    { operation: 'create', uncertain: true },
    { operation: 'update', uncertain: true },
    { operation: 'delete', uncertain: true },
  ] as const)(
    'cancels a stale GET before $operation reconciliation (uncertain: $uncertain)',
    async ({ operation, uncertain }) => {
      const existing = orderSchema.parse(sampleOrders[0])
      const input = orderInputSchema.parse({ ...existing, city: 'Updated city' })
      const changed = orderSchema.parse({
        ...existing,
        ...input,
        customer: existing.customer,
        id: operation === 'create' ? 'ORD-created' : existing.id,
      })
      const saved =
        operation === 'create'
          ? [changed, ...sampleOrders]
          : operation === 'update'
            ? sampleOrders.map((order) => (order.id === existing.id ? changed : order))
            : sampleOrders.filter((order) => order.id !== existing.id)
      const firstResponse = deferred<Response>()
      const invalidated = deferred<undefined>()
      let firstSignal: AbortSignal | null | undefined
      let reads = 0
      let writes = 0
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>((_url, options) => {
          if (options?.method) {
            writes += 1
            if (uncertain) return Promise.reject(new TypeError('Response lost after commit'))
            return Promise.resolve(
              operation === 'delete' ? new Response(null, { status: 204 }) : Response.json(changed),
            )
          }
          reads += 1
          if (reads === 1) {
            firstSignal = options?.signal
            return firstResponse.promise
          }
          return Promise.resolve(Response.json(saved))
        }),
      )
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: 3, retryDelay: 0 } },
      })
      client.setQueryData(['customers', 'list'], ['independent customer data'])
      const unsubscribe = client.getQueryCache().subscribe((event) => {
        if (
          event.type === 'updated' &&
          (event.query.queryKey as readonly unknown[])[0] === 'orders' &&
          event.query.state.isInvalidated
        )
          invalidated.resolve(undefined)
      })
      function Wrapper({ children }: PropsWithChildren) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>
      }
      try {
        const { result } = renderHook(
          () => ({
            orders: useQuery(ordersQueryOptions()),
            create: useCreateOrder(),
            update: useUpdateOrder(),
            delete: useDeleteOrder(),
          }),
          { wrapper: Wrapper },
        )
        await waitFor(() => {
          expect(reads).toBe(1)
        })
        await act(async () => {
          const mutation =
            operation === 'create'
              ? result.current.create.mutateAsync(input)
              : operation === 'update'
                ? result.current.update.mutateAsync({ id: existing.id, input })
                : result.current.delete.mutateAsync(existing.id)
          const outcome = mutation.catch((error: unknown) => error)
          await invalidated.promise
          firstResponse.resolve(Response.json(sampleOrders))
          const settled = await outcome
          if (uncertain)
            expect(settled).toMatchObject({ code: 'NETWORK_ERROR', mayHaveSucceeded: true })
        })
        expect(firstSignal?.aborted).toBe(true)
        expect(reads).toBe(2)
        expect(writes).toBe(1)
        await waitFor(() => {
          expect(result.current.orders.data).toEqual(saved)
          expect(result.current[operation].isError).toBe(uncertain)
        })
        expect(client.getQueryData(orderKeys.lists())).toEqual(saved)
        expect(client.getQueryData(['customers', 'list'])).toEqual(['independent customer data'])
        expect(client.getQueryState(['customers', 'list'])?.isInvalidated).toBe(false)
      } finally {
        unsubscribe()
        cleanup()
        client.clear()
      }
    },
  )

  it('keeps the successful update in cache when its follow-up GET fails', async () => {
    const existing = orderSchema.parse(sampleOrders[0])
    const updated = orderSchema.parse({ ...existing, status: 'Shipped' })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) =>
        options?.method === 'PATCH'
          ? Promise.resolve(Response.json(updated))
          : Promise.reject(new TypeError('Offline')),
      ),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(orderKeys.lists(), [existing])
    function Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    try {
      const { result } = renderHook(
        () => ({ orders: useQuery(ordersQueryOptions()), update: useUpdateOrder() }),
        { wrapper: Wrapper },
      )
      await act(async () => {
        await result.current.update.mutateAsync({
          id: existing.id,
          input: orderInputSchema.parse(updated),
        })
      })
      await waitFor(() => {
        expect(result.current.orders.isError).toBe(true)
      })
      expect(result.current.orders.data).toEqual([updated])
      expect(result.current.update.isSuccess).toBe(true)
    } finally {
      cleanup()
      client.clear()
    }
  })
})
