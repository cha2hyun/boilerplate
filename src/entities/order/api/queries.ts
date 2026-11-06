import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import {
  orderListDefaults,
  orderListParamsSchema,
  type OrderInput,
  type OrderListParams,
  type SampleOrder,
} from '../model/schema'
import { httpOrderAdapter } from './http'

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: OrderListParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  summary: () => [...orderKeys.all, 'summary'] as const,
}

export function ordersQueryOptions(params: OrderListParams = orderListDefaults) {
  const validated = orderListParamsSchema.parse(params)
  return queryOptions({
    queryKey: orderKeys.list(validated),
    queryFn: ({ signal }) => httpOrderAdapter.list(validated, signal),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
export function orderDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: async ({ signal }) => {
      try {
        return await httpOrderAdapter.detail(id, signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    enabled: id.length > 0,
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
export function orderSummaryQueryOptions() {
  return queryOptions({
    queryKey: orderKeys.summary(),
    queryFn: ({ signal }) => httpOrderAdapter.summary(signal),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

async function reconcileUncertainMutation(error: Error, queryClient: QueryClient) {
  if (!(error instanceof ApiError) || !error.mayHaveSucceeded) return
  await queryClient.cancelQueries({ queryKey: orderKeys.all })
  await queryClient.invalidateQueries({ queryKey: orderKeys.all })
}

async function reconcileConfirmedMutation(
  client: QueryClient,
  id: string,
  order: SampleOrder | null,
) {
  await client.cancelQueries({ queryKey: orderKeys.all })
  client.setQueryData(orderKeys.detail(id), order)
  // Membership, order and totals belong to the server. Never guess a paginated result.
  await client.invalidateQueries({ queryKey: orderKeys.all })
}

export function useCreateOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: OrderInput) => httpOrderAdapter.create(input),
    retry: false,
    onError: (error) => reconcileUncertainMutation(error, client),
    onSuccess: (order) => reconcileConfirmedMutation(client, order.id, order),
  })
}
export function useUpdateOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrderInput }) =>
      httpOrderAdapter.update(id, input),
    retry: false,
    onError: (error) => reconcileUncertainMutation(error, client),
    onSuccess: (order) => reconcileConfirmedMutation(client, order.id, order),
  })
}
export function useDeleteOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => httpOrderAdapter.delete(id),
    retry: false,
    onError: (error) => reconcileUncertainMutation(error, client),
    onSuccess: (_result, id) => reconcileConfirmedMutation(client, id, null),
  })
}
