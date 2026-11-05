import { reportError } from '@/shared/lib/error-reporting'
import { logErrorLocally } from './local-diagnostics'

type InitializationPhase = 'localization' | 'demo'
type InitializationResult = 'ready' | InitializationPhase

class InitializationFailure extends Error {
  readonly phase: InitializationPhase

  constructor(phase: InitializationPhase) {
    super('Application initialization failed')
    this.phase = phase
  }
}

function observeInitialization(task: Promise<unknown>, phase: InitializationPhase) {
  return task.catch((error: unknown) => {
    reportError(error, { source: 'startup' })
    logErrorLocally(error, 'startup')
    throw new InitializationFailure(phase)
  })
}

/** Fail fast with the failed phase; Promise.all also observes a later second rejection. */
export async function initializeApplication(tasks: {
  localization: Promise<unknown>
  demo: Promise<unknown>
}): Promise<InitializationResult> {
  try {
    await Promise.all([
      observeInitialization(tasks.localization, 'localization'),
      observeInitialization(tasks.demo, 'demo'),
    ])
    return 'ready'
  } catch (error) {
    if (error instanceof InitializationFailure) return error.phase
    throw error
  }
}
