import type {
  OrderInput,
  SampleOrder,
  OrderListParams,
  OrderPage,
  OrderSummary,
} from '../model/schema'

export interface OrderAdapter {
  list(params?: OrderListParams, signal?: AbortSignal): Promise<OrderPage>
  detail(id: string, signal?: AbortSignal): Promise<SampleOrder>
  summary(signal?: AbortSignal): Promise<OrderSummary>
  create(input: OrderInput, signal?: AbortSignal): Promise<SampleOrder>
  update(id: string, input: OrderInput, signal?: AbortSignal): Promise<SampleOrder>
  delete(id: string, signal?: AbortSignal): Promise<void>
}
