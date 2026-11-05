import { ErrorFallback } from '../error-handling/error-fallback'

export function StartupError() {
  return <ErrorFallback variant="startup" />
}
