import type { PropsWithChildren } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { customerSchema } from '../model/schema'
import {
  customerKeys,
  customersQueryOptions,
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from './queries'
import { sampleCustomers } from './seed'

vi.mock('@/shared/config', () => ({
  env: { dataSource: 'api', apiBaseUrl: '/api' },
}))

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

describe('customer mutation and list concurrency', () => {
  it.each(['create', 'update', 'delete'] as const)(
    'reconciles an uncertain %s after cancelling an older list request',
    async (operation) => {
      const existing = sampleCustomers[0]
      if (!existing) throw new Error('The fixture needs a customer to modify.')
      const input = {
        name: 'Applied before disconnection',
        email: 'lee@example.test',
        status: 'Active' as const,
        city: 'Seoul',
        country: 'South Korea',
        joined: '2026-11-05',
      }
      const changed = customerSchema.parse({
        ...existing,
        ...input,
        id: operation === 'create' ? 'cus_created' : existing.id,
      })
      const savedCustomers =
        operation === 'create'
          ? [changed, ...sampleCustomers]
          : operation === 'update'
            ? sampleCustomers.map((customer) => (customer.id === existing.id ? changed : customer))
            : sampleCustomers.filter((customer) => customer.id !== existing.id)
      const initialResponse = deferred<Response>()
      const invalidated = deferred<undefined>()
      let firstSignal: AbortSignal | null | undefined
      let reads = 0
      let writes = 0
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>((_url, options) => {
          if (options?.method) {
            writes += 1
            return Promise.reject(new TypeError('Connection lost after commit'))
          }
          reads += 1
          if (reads === 1) {
            firstSignal = options?.signal
            return initialResponse.promise
          }
          return Promise.resolve(Response.json(savedCustomers))
        }),
      )
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: 2 } },
      })
      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (event.type === 'updated' && event.query.state.isInvalidated)
          invalidated.resolve(undefined)
      })
      function Wrapper({ children }: PropsWithChildren) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      }
      try {
        const { result } = renderHook(
          () => ({
            customers: useQuery(customersQueryOptions()),
            create: useCreateCustomer(),
            update: useUpdateCustomer(),
            delete: useDeleteCustomer(),
          }),
          { wrapper: Wrapper },
        )
        await waitFor(() => {
          expect(reads).toBe(1)
        })

        await act(async () => {
          const pending =
            operation === 'create'
              ? result.current.create.mutateAsync(input)
              : operation === 'update'
                ? result.current.update.mutateAsync({ id: existing.id, input })
                : result.current.delete.mutateAsync(existing.id)
          const outcome = pending.catch((error: unknown) => error)
          await invalidated.promise
          initialResponse.resolve(Response.json(sampleCustomers))
          expect(await outcome).toMatchObject({ code: 'NETWORK_ERROR', mayHaveSucceeded: true })
        })
        expect(firstSignal?.aborted).toBe(true)
        expect(reads).toBe(2)
        expect(writes).toBe(1)
        await waitFor(() => {
          expect(result.current.customers.data).toEqual(savedCustomers)
          expect(result.current[operation].isError).toBe(true)
        })
      } finally {
        unsubscribe()
        cleanup()
        queryClient.clear()
      }
    },
  )

  it('keeps a successful creation when the initial list response arrives late', async () => {
    const input = {
      name: 'Created during loading',
      email: 'new@example.test',
      status: 'Active' as const,
      city: 'Seoul',
      country: 'South Korea',
      joined: '2026-11-05',
    }
    const created = customerSchema.parse({ ...sampleCustomers[0], ...input, id: 'cus_created' })
    const initialResponse = deferred<Response>()
    const invalidated = deferred<undefined>()
    let firstSignal: AbortSignal | null | undefined
    let reads = 0
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) => {
        if (options?.method === 'POST') return Promise.resolve(Response.json(created))
        reads += 1
        if (reads === 1) {
          firstSignal = options?.signal
          return initialResponse.promise
        }
        return Promise.resolve(Response.json([created, ...sampleCustomers]))
      }),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: 2 } },
    })
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.isInvalidated)
        invalidated.resolve(undefined)
    })
    function Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    try {
      const { result } = renderHook(
        () => ({ customers: useQuery(customersQueryOptions()), create: useCreateCustomer() }),
        { wrapper: Wrapper },
      )
      await waitFor(() => {
        expect(reads).toBe(1)
      })

      await act(async () => {
        const mutation = result.current.create.mutateAsync(input)
        await invalidated.promise
        initialResponse.resolve(Response.json(sampleCustomers))
        await mutation
      })

      expect(firstSignal?.aborted).toBe(true)
      expect(reads).toBe(2)
      await waitFor(() => {
        expect(result.current.customers.data).toEqual([created, ...sampleCustomers])
      })
      expect(queryClient.getQueryData(customerKeys.lists())).toEqual([created, ...sampleCustomers])
    } finally {
      unsubscribe()
      cleanup()
      queryClient.clear()
    }
  })
})
