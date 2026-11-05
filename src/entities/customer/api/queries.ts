import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import type { SampleCustomer, CustomerInput } from '../model/schema'
import { httpCustomerAdapter } from './http'

const adapter = httpCustomerAdapter
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
}

export function customersQueryOptions() {
  return queryOptions({
    queryKey: customerKeys.lists(),
    queryFn: ({ signal }) => adapter.list(signal),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

async function reconcileUncertainMutation(error: Error, queryClient: QueryClient) {
  if (!(error instanceof ApiError) || !error.mayHaveSucceeded) return
  await queryClient.cancelQueries({ queryKey: customerKeys.all })
  await queryClient.invalidateQueries({ queryKey: customerKeys.all })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (input: CustomerInput) => adapter.create(input),
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (customer) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all })
      queryClient.setQueryData<SampleCustomer[]>(customerKeys.lists(), (current) =>
        current ? [customer, ...current.filter((item) => item.id !== customer.id)] : undefined,
      )
      return queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) => adapter.update(id, input),
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (updated) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all })
      queryClient.setQueryData<SampleCustomer[]>(customerKeys.lists(), (current) =>
        current?.map((customer) => (customer.id === updated.id ? updated : customer)),
      )
      return queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (id: string) => adapter.delete(id),
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (_result, id) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all })
      queryClient.setQueryData<SampleCustomer[]>(customerKeys.lists(), (current) =>
        current?.filter((customer) => customer.id !== id),
      )
      return queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}
