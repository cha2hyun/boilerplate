const sources = [
  'app-boundary',
  'react-caught',
  'react-uncaught',
  'react-recoverable',
  'route',
  'startup',
  'window-error',
  'unhandled-rejection',
  'unknown',
] as const

export type ErrorSource = (typeof sources)[number]
export type ErrorKind =
  | 'object'
  | 'function'
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'undefined'
  | 'null'

/** Deliberately excludes messages, stacks, URLs, thrown values and arbitrary metadata. */
export interface ErrorReport {
  readonly version: 1
  readonly source: ErrorSource
  readonly kind: ErrorKind
}

export type ErrorReporter = (report: ErrorReport) => void | Promise<void>
export interface ErrorContext {
  source: ErrorSource
}

const dedupeWindowMs = 5_000

function safeSource(context: ErrorContext): ErrorSource {
  try {
    const source = context.source
    return sources.find((candidate) => candidate === source) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** A small, isolated adapter boundary; no transport or external service is installed by default. */
export function createErrorReporting() {
  let adapter: ErrorReporter | undefined
  let delivering = false
  const objects = new WeakMap<object, number>()
  // Primitive values are never retained: different throws of the same type can coalesce.
  const primitives = new Map<ErrorKind, number>()

  function reportError(error: unknown, context: ErrorContext): void {
    if (!adapter || delivering) return

    const kind = error === null ? 'null' : typeof error
    const now = Date.now()
    const object =
      (typeof error === 'object' && error !== null) || typeof error === 'function'
        ? error
        : undefined
    const previous = object ? objects.get(object) : primitives.get(kind)
    if (previous !== undefined && now - previous < dedupeWindowMs) return
    if (object) objects.set(object, now)
    else primitives.set(kind, now)

    // Do not inspect error properties, prototypes, toString or JSON serialization.
    delivering = true
    try {
      const report: ErrorReport = Object.freeze({ version: 1, source: safeSource(context), kind })
      const pending = adapter(report)
      if (pending) {
        // Observe rejection immediately, without feeding adapter failures back into reporting.
        void Promise.resolve(pending).catch(() => undefined)
      }
    } catch {
      // Reporting must never become another application failure.
    } finally {
      delivering = false
    }
  }

  function setErrorReporter(next: ErrorReporter): () => void {
    const previous = adapter
    adapter = next
    return () => {
      if (adapter === next) adapter = previous
    }
  }

  return { reportError, setErrorReporter }
}

export const { reportError, setErrorReporter } = createErrorReporting()
