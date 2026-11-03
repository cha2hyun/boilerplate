import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import { z } from 'zod'
import { createPreferenceStorage } from './storage'

export const preferencesSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(40, 'Use 40 characters or fewer'),
  compactMode: z.boolean(),
})
type Preferences = z.infer<typeof preferencesSchema>
type PreferencesState = Preferences & {
  save: (value: Preferences) => void
  reset: () => void
}
const defaults: Preferences = { workspaceName: 'Acme Studio', compactMode: false }

export function createPreferencesStore(storage: StateStorage = createPreferenceStorage()) {
  return create<PreferencesState>()(
    persist(
      (set) => ({
        ...defaults,
        save: (value) => {
          set(preferencesSchema.parse(value))
        },
        reset: () => {
          set(defaults)
        },
      }),
      {
        name: 'blueprint-preferences',
        version: 1,
        storage: createJSONStorage<Preferences>(() => storage),
        partialize: ({ workspaceName, compactMode }) => ({ workspaceName, compactMode }),
        migrate: () => defaults,
        merge: (persisted, current) => {
          const result = preferencesSchema.safeParse(persisted)
          return { ...current, ...(result.success ? result.data : defaults) }
        },
      },
    ),
  )
}

export const usePreferences = createPreferencesStore()
