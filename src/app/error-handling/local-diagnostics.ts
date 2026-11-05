import type { ErrorSource } from '@/shared/lib/error-reporting'

/** Local diagnostics are separate from the privacy-limited external adapter contract. */
export function logErrorLocally(error: unknown, source: ErrorSource): void {
  try {
    if (import.meta.env.DEV) console.error('Application error.', source, error)
    else console.error('Application error.', source)
  } catch {
    // A replaced console must not break recovery or create a reporting loop.
  }
}
