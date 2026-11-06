import { storageKeys } from '@/shared/config/product'

// One write transaction on this store runs at a time across tabs, including on plain HTTP.
// Records stay in the existing localStorage key. The coordination store contains no order data.
let coordinator: Promise<IDBDatabase | null> | undefined

function openCoordinator(): Promise<IDBDatabase | null> {
  coordinator ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(`${storageKeys.demoOrders}.lock`, 1)
      let blocked = false
      request.onupgradeneeded = () => {
        request.result.createObjectStore('orders')
      }
      request.onblocked = () => {
        blocked = true
        resolve(null)
      }
      request.onsuccess = () => {
        const db = request.result
        if (blocked) {
          db.close()
          return
        }
        db.onversionchange = () => {
          coordinator = undefined
          db.close()
        }
        db.onclose = () => {
          coordinator = undefined
        }
        resolve(db)
      }
      request.onerror = () => {
        resolve(null)
      }
    } catch {
      resolve(null)
    }
  })
  return coordinator
}

/** Run the synchronous read/compare/write once. If locking is unavailable, the caller uses memory. */
export async function withOrderStorageLock<T>(action: (shared: boolean) => T): Promise<T> {
  const db = await openCoordinator()
  if (!db) return action(false)
  return new Promise<T>((resolve, reject) => {
    let ran = false
    function run(shared: boolean) {
      if (ran) return
      ran = true
      try {
        resolve(action(shared))
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Order storage access failed.'))
      }
    }
    try {
      const transaction = db.transaction('orders', 'readwrite')
      const request = transaction.objectStore('orders').get('lock')
      request.onsuccess = () => {
        run(true)
      }
      transaction.onabort = () => {
        run(false)
      }
    } catch {
      run(false)
    }
  })
}
