import type { RootOptions } from 'react-dom/client'
import { reportError } from '@/shared/lib/error-reporting'
import { logErrorLocally } from './local-diagnostics'

export const reactErrorHandlers = {
  onCaughtError: (error) => {
    reportError(error, { source: 'react-caught' })
    logErrorLocally(error, 'react-caught')
  },
  onUncaughtError: (error) => {
    reportError(error, { source: 'react-uncaught' })
    logErrorLocally(error, 'react-uncaught')
  },
  onRecoverableError: (error) => {
    reportError(error, { source: 'react-recoverable' })
    logErrorLocally(error, 'react-recoverable')
  },
} satisfies RootOptions

/** Reports execution failures without replacing healthy UI or cancelling browser diagnostics. */
export function installGlobalErrorReporting(target: Window = window): () => void {
  function onError(event: ErrorEvent) {
    // event.message / filename / line numbers may contain private application data.
    reportError(event.error as unknown, { source: 'window-error' })
  }
  function onRejection(event: PromiseRejectionEvent) {
    reportError(event.reason as unknown, { source: 'unhandled-rejection' })
  }
  target.addEventListener('error', onError)
  target.addEventListener('unhandledrejection', onRejection)
  return () => {
    target.removeEventListener('error', onError)
    target.removeEventListener('unhandledrejection', onRejection)
  }
}
