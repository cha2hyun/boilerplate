import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import type { OrderInput, SampleOrder } from '../model/schema'
import { httpOrderAdapter } from './http'

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
}

export function ordersQueryOptions() {
  return queryOptions({
    queryKey: orderKeys.lists(),
    queryFn: ({ signal }) => httpOrderAdapter.list(signal),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

async function reconcileUncertainMutation(error: Error, queryClient: QueryClient) {
  if (!(error instanceof ApiError) || !error.mayHaveSucceeded) return
  await queryClient.cancelQueries({ queryKey: orderKeys.all })
  await queryClient.invalidateQueries({ queryKey: orderKeys.all })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OrderInput) => httpOrderAdapter.create(input),
    retry: false,
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (order) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all })
      queryClient.setQueryData<SampleOrder[]>(orderKeys.lists(), (current) =>
        current ? [order, ...current.filter((item) => item.id !== order.id)] : undefined,
      )
      return queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrderInput }) =>
      httpOrderAdapter.update(id, input),
    retry: false,
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (updated) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all })
      queryClient.setQueryData<SampleOrder[]>(orderKeys.lists(), (current) =>
        current?.map((order) => (order.id === updated.id ? updated : order)),
      )
      return queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => httpOrderAdapter.delete(id),
    retry: false,
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (_result, id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all })
      queryClient.setQueryData<SampleOrder[]>(orderKeys.lists(), (current) =>
        current?.filter((order) => order.id !== id),
      )
      return queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}
