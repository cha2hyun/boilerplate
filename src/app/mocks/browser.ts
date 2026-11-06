import { setupWorker } from 'msw/browser'
import { createDemoCustomerAdapter } from '@/entities/customer'
import { createDemoOrderAdapter } from '@/entities/order'
import { storageKeys } from '@/shared/config/product'
import { markDemoStorageUnavailable } from '@/shared/lib/demo-storage-status'
import { createDemoHandlers } from './handlers'

// Only the running browser demo announces a fallback. Tests can inject isolated adapters.
const handlers = createDemoHandlers({
  orders: createDemoOrderAdapter({
    delayMs: 0,
    onStorageUnavailable: () => {
      markDemoStorageUnavailable(storageKeys.demoOrders)
    },
  }),
  customers: createDemoCustomerAdapter({
    delayMs: 0,
    onStorageUnavailable: () => {
      markDemoStorageUnavailable(storageKeys.demoCustomers)
    },
  }),
})
export const worker = setupWorker(...handlers)
