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
  reset: () => Preferences
}
const defaults: Preferences = { workspaceName: 'Acme Studio', compactMode: false }

export function createPreferencesStore(
  storage: StateStorage = createPreferenceStorage(),
  defaultPreferences: Preferences = defaults,
) {
  const initialPreferences = preferencesSchema.parse(defaultPreferences)
  return create<PreferencesState>()(
    persist(
      (set) => ({
        ...initialPreferences,
        save: (value) => {
          set(preferencesSchema.parse(value))
        },
        reset: () => {
          set(initialPreferences)
          return { ...initialPreferences }
        },
      }),
      {
        name: 'blueprint-preferences',
        version: 1,
        storage: createJSONStorage<Preferences>(() => storage),
        partialize: ({ workspaceName, compactMode }) => ({ workspaceName, compactMode }),
        migrate: () => initialPreferences,
        merge: (persisted, current) => {
          const result = preferencesSchema.safeParse(persisted)
          return { ...current, ...(result.success ? result.data : initialPreferences) }
        },
      },
    ),
  )
}

export const usePreferences = createPreferencesStore()
