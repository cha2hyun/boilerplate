import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { z } from 'zod'
import { storageKeys } from '@/shared/config/product'
import { createPreferenceStorage } from '@/shared/lib/preference-storage'
import { tableViewStateSchema, type TableId, type TableViewState } from './view-state'

const preferencesSchema = z.object({
  views: z.object({
    projects: tableViewStateSchema.optional().catch(undefined),
    orders: tableViewStateSchema.optional().catch(undefined),
    customers: tableViewStateSchema.optional().catch(undefined),
  }),
})
interface Preferences {
  views: Partial<Record<TableId, TableViewState>>
}
type Store = Preferences & {
  save: (id: TableId, state: TableViewState) => void
  reset: (id: TableId) => void
}

export function createTableViewStore(storage: StateStorage = createPreferenceStorage()) {
  return create<Store>()(
    persist(
      (set) => ({
        views: {},
        save: (id, state) => {
          const valid = tableViewStateSchema.parse(state)
          set((current) => ({ views: { ...current.views, [id]: valid } }))
        },
        reset: (id) => {
          set((current) => {
            const views = Object.fromEntries(
              Object.entries(current.views).filter(([key]) => key !== id),
            )
            return { views }
          })
        },
      }),
      {
        name: storageKeys.tableViews,
        version: 1,
        storage: createJSONStorage<Preferences>(() => storage),
        partialize: ({ views }) => ({ views }),
        migrate: () => ({ views: {} }),
        merge: (persisted, current) => {
          const parsed = preferencesSchema.safeParse(persisted)
          return { ...current, views: parsed.success ? parsed.data.views : {} }
        },
      },
    ),
  )
}

export const useTableViewStore = createTableViewStore()
