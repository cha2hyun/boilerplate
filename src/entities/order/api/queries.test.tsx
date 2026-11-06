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
import { pageOrders } from '../model/list'
import { orderListDefaults } from '../model/schema'

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
  it.each(
    (['create', 'update', 'delete'] as const).flatMap((operation) =>
      ([null, 'network', 500, 502, 504] as const).map((failure) => ({ operation, failure })),
    ),
  )(
    'cancels a stale GET before $operation reconciliation (failure: $failure)',
    async ({ operation, failure }) => {
      const uncertain = failure !== null
      const existing = orderSchema.parse(sampleOrders[0])
      const input = orderInputSchema.parse({ ...existing, city: 'Updated city' })
      const changed = orderSchema.parse({
        ...existing,
        ...input,
        customer: existing.customer,
        revision: operation === 'update' ? 2 : 1,
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
            if (failure === 'network')
              return Promise.reject(new TypeError('Response lost after commit'))
            if (typeof failure === 'number')
              return Promise.resolve(new Response(null, { status: failure }))
            return Promise.resolve(
              operation === 'delete' ? new Response(null, { status: 204 }) : Response.json(changed),
            )
          }
          reads += 1
          if (reads === 1) {
            firstSignal = options?.signal
            return firstResponse.promise
          }
          return Promise.resolve(Response.json(pageOrders(saved, orderListDefaults)))
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
                ? result.current.update.mutateAsync({
                    id: existing.id,
                    input,
                    revision: existing.revision,
                  })
                : result.current.delete.mutateAsync(existing.id)
          const outcome = mutation.catch((error: unknown) => error)
          await invalidated.promise
          firstResponse.resolve(Response.json(pageOrders(sampleOrders, orderListDefaults)))
          const settled = await outcome
          if (uncertain)
            expect(settled).toMatchObject({
              code: failure === 'network' ? 'NETWORK_ERROR' : 'HTTP_ERROR',
              status: failure === 'network' ? null : failure,
              mayHaveSucceeded: true,
            })
        })
        expect(firstSignal?.aborted).toBe(true)
        expect(reads).toBe(2)
        expect(writes).toBe(1)
        await waitFor(() => {
          expect(result.current.orders.data).toEqual(pageOrders(saved, orderListDefaults))
          expect(result.current[operation].isError).toBe(uncertain)
        })
        expect(client.getQueryData(orderKeys.list(orderListDefaults))).toEqual(
          pageOrders(saved, orderListDefaults),
        )
        expect(client.getQueryData(['customers', 'list'])).toEqual(['independent customer data'])
        expect(client.getQueryState(['customers', 'list'])?.isInvalidated).toBe(false)
      } finally {
        unsubscribe()
        cleanup()
        client.clear()
      }
    },
  )

  it('keeps the confirmed detail and last known page when its follow-up GET fails', async () => {
    const existing = orderSchema.parse(sampleOrders[0])
    const updated = orderSchema.parse({ ...existing, revision: 2, status: 'Shipped' })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) =>
        options?.method === 'PATCH'
          ? Promise.resolve(Response.json(updated))
          : Promise.reject(new TypeError('Offline')),
      ),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(
      orderKeys.list(orderListDefaults),
      pageOrders([existing], orderListDefaults),
    )
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
          revision: existing.revision,
        })
      })
      await waitFor(() => {
        expect(result.current.orders.isError).toBe(true)
      })
      expect(result.current.orders.data?.items).toEqual([existing])
      expect(client.getQueryData(orderKeys.detail(existing.id))).toEqual(updated)
      expect(result.current.update.isSuccess).toBe(true)
    } finally {
      cleanup()
      client.clear()
    }
  })
})
