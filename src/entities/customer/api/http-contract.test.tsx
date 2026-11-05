import type { PropsWithChildren } from 'react'
import { httpCustomerAdapter } from './http'
import { sampleCustomers } from './seed'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import type { SampleCustomer } from '../model/schema'
import {
  customerKeys,
  customersQueryOptions,
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from './queries'

// Keep the real adapter, transport and Query lifecycle; replace only the server boundary.
vi.mock('@/shared/config', () => ({
  env: { dataSource: 'api', apiBaseUrl: 'https://api.example.test/workspace/v1/' },
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('rejects duplicate identities at the HTTP list boundary', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json([sampleCustomers[0], sampleCustomers[0]])),
  )
  await expect(httpCustomerAdapter.list()).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
    status: 200,
    mayHaveSucceeded: false,
  })
})

it('sends the HTTP customer CRUD contract and synchronizes the active list from server responses', async () => {
  const existing: SampleCustomer = {
    id: 'existing',
    name: 'Existing customer',
    email: 'sam@example.test',
    initials: 'SC',
    status: 'Active',
    city: 'Seoul',
    country: 'South Korea',
    joined: '2026-11-05',
    orders: 5,
    spent: 12000,
    lastOrder: '2026-11-04',
  }
  const createInput = {
    name: '  HTTP contract  ',
    email: '  lee@example.test  ',
    status: 'Active' as const,
    city: '  Seoul  ',
    country: '  South Korea  ',
    joined: '2026-11-05',
    id: 'must-not-be-sent',
    orders: 99,
    spent: 999,
    initials: 'X',
    lastOrder: null,
  }
  const createBody = {
    name: 'HTTP contract',
    email: 'lee@example.test',
    status: 'Active',
    city: 'Seoul',
    country: 'South Korea',
    joined: '2026-11-05',
  }
  const created: SampleCustomer = {
    ...existing,
    ...createBody,
    status: 'Active',
    id: 'cus /한글?#%',
    orders: 0,
    spent: 0,
    lastOrder: null,
  }
  const createList = [created, existing]
  const updateInput = { ...createInput, name: '  Edited over HTTP  ', status: 'Inactive' as const }
  const updateBody = { ...createBody, name: 'Edited over HTTP', status: 'Inactive' }
  const updated: SampleCustomer = { ...created, ...updateBody, status: 'Inactive' }
  const updateList = [updated, existing]
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json([existing]))
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockResolvedValueOnce(Response.json(createList))
    .mockResolvedValueOnce(Response.json(updated))
    .mockResolvedValueOnce(Response.json(updateList))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json([existing]))
  vi.stubGlobal('fetch', fetchMock)

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
        remove: useDeleteCustomer(),
      }),
      { wrapper: Wrapper },
    )
    await waitFor(() => {
      expect(result.current.customers.data).toEqual([existing])
    })

    await act(async () => {
      expect(await result.current.create.mutateAsync(createInput)).toEqual(created)
    })
    await waitFor(() => {
      expect(result.current.customers.data).toEqual(createList)
    })
    expect(queryClient.getQueryData(customerKeys.lists())).toEqual(createList)

    await act(async () => {
      expect(
        await result.current.update.mutateAsync({ id: created.id, input: updateInput }),
      ).toEqual(updated)
    })
    await waitFor(() => {
      expect(result.current.customers.data).toEqual(updateList)
    })
    expect(queryClient.getQueryData(customerKeys.lists())).toEqual(updateList)

    await act(async () => {
      await result.current.remove.mutateAsync(created.id)
    })
    await waitFor(() => {
      expect(result.current.customers.data).toEqual([existing])
      expect(result.current.remove.isSuccess).toBe(true)
    })
    expect(queryClient.getQueryData(customerKeys.lists())).toEqual([existing])

    const collectionUrl = 'https://api.example.test/workspace/v1/customers'
    const itemUrl = `${collectionUrl}/cus%20%2F%ED%95%9C%EA%B8%80%3F%23%25`
    expect(
      fetchMock.mock.calls.map(([url, options]) => ({
        url,
        method: options?.method ?? 'GET',
        body: options?.body,
      })),
    ).toEqual([
      { url: collectionUrl, method: 'GET', body: undefined },
      { url: collectionUrl, method: 'POST', body: JSON.stringify(createBody) },
      { url: collectionUrl, method: 'GET', body: undefined },
      { url: itemUrl, method: 'PATCH', body: JSON.stringify(updateBody) },
      { url: collectionUrl, method: 'GET', body: undefined },
      { url: itemUrl, method: 'DELETE', body: undefined },
      { url: collectionUrl, method: 'GET', body: undefined },
    ])
  } finally {
    cleanup()
    queryClient.clear()
  }
})
