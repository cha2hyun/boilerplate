import { useSyncExternalStore } from 'react'
import { sessionStore } from './model/session'

export {
  demoCredentials,
  demoLoginPath,
  demoLoginRequestSchema,
  checkDemoCredentials,
  validateRequiredDemoCredentials,
  type DemoCredentialErrors,
  type DemoLoginScenario,
  type DemoSession,
} from './model/login-contract'
export { signInDemoAccount, signInWithMicrosoftDemo } from './api/login'
export const getDemoSession = sessionStore.getSnapshot
export const endDemoSession = sessionStore.end

export function useDemoSession() {
  return useSyncExternalStore(sessionStore.subscribe, getDemoSession, () => null)
}
