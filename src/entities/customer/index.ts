export {
  customerKeys,
  customersQueryOptions,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from './api/queries'
export { createDemoCustomerAdapter, CUSTOMER_STORAGE_KEY } from './api/demo'
export { sampleCustomers } from './api/seed'
export {
  customerSchema,
  customerInputSchema,
  customersSchema,
  customerStatuses,
} from './model/schema'
export type { SampleCustomer, CustomerInput, CustomerStatus } from './model/schema'
