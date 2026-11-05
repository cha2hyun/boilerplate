import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { startDemoMocks } from '@/app/mocks/start'
import { StartupError } from '@/app/mocks/startup-error'
import { AppErrorBoundary } from '@/app/error-handling/app-error-boundary'
import { ErrorFallback } from '@/app/error-handling/error-fallback'
import { initializeApplication } from '@/app/error-handling/initialize-application'
import { logErrorLocally } from '@/app/error-handling/local-diagnostics'
import {
  installGlobalErrorReporting,
  reactErrorHandlers,
} from '@/app/error-handling/runtime-errors'
import { reportError } from '@/shared/lib/error-reporting'
import { i18nReady } from '@/shared/lib/i18n'
import '@/app/styles/globals.css'

const removeGlobalErrorReporting = installGlobalErrorReporting()
if (import.meta.hot) import.meta.hot.dispose(removeGlobalErrorReporting)
const root = document.getElementById('root')
if (!root) throw new Error('Application root element is missing')
const reactRoot = createRoot(root, reactErrorHandlers)

void initializeApplication({ localization: i18nReady, demo: startDemoMocks() })
  .then((result) => {
    const content =
      result === 'localization' ? <ErrorFallback /> : result === 'demo' ? <StartupError /> : <App />
    reactRoot.render(
      <StrictMode>
        <AppErrorBoundary>{content}</AppErrorBoundary>
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    reportError(error, { source: 'startup' })
    logErrorLocally(error, 'startup')
    try {
      reactRoot.render(
        <AppErrorBoundary>
          <ErrorFallback />
        </AppErrorBoundary>,
      )
    } catch (fallbackError) {
      // An unusable root cannot be recovered by rendering to that same root repeatedly.
      reportError(fallbackError, { source: 'startup' })
      logErrorLocally(fallbackError, 'startup')
    }
  })
