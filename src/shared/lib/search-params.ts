import { z } from 'zod'

// TanStack Router parses JSON-compatible query values before route validation.
// Avoid coercion here: arrays, objects and booleans are not valid scalar filters.
export const searchTextSchema = z
  .union([z.string(), z.number().transform(String)])
  .pipe(z.string().max(200))
  .catch('')
  .default('')
export const searchPageSchema = z.number().int().min(1).max(100_000).catch(1).default(1)

export interface SearchChangeOptions {
  replace?: boolean
}
export type SearchChange<T> = (patch: Partial<T>, options?: SearchChangeOptions) => void
