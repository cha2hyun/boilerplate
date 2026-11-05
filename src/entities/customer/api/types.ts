import type { CustomerInput, SampleCustomer } from '../model/schema'

export interface CustomerAdapter {
  list(signal?: AbortSignal): Promise<SampleCustomer[]>
  create(input: CustomerInput, signal?: AbortSignal): Promise<SampleCustomer>
  update(id: string, input: CustomerInput, signal?: AbortSignal): Promise<SampleCustomer>
  delete(id: string, signal?: AbortSignal): Promise<void>
}
