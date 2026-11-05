import type { OrderInput, SampleOrder } from '../model/schema'

export interface OrderAdapter {
  list(signal?: AbortSignal): Promise<SampleOrder[]>
  create(input: OrderInput, signal?: AbortSignal): Promise<SampleOrder>
  update(id: string, input: OrderInput, signal?: AbortSignal): Promise<SampleOrder>
  delete(id: string, signal?: AbortSignal): Promise<void>
}
