import { useSyncExternalStore } from 'react'
import { demoStorageStatus } from '@/shared/lib/demo-storage-status'

export function useDemoStorageUnavailable() {
  return useSyncExternalStore(
    demoStorageStatus.subscribe,
    demoStorageStatus.getSnapshot,
    () => false,
  )
}
