import { useSyncExternalStore } from 'react'
import { sessionStore } from './model/session'

export { demoCredentials, type DemoSession, type DemoCredentialErrors } from './model/session'
export const getDemoSession = sessionStore.getSnapshot
export const signInDemoAccount = sessionStore.signIn
export const endDemoSession = sessionStore.end

export function useDemoSession() {
  return useSyncExternalStore(sessionStore.subscribe, getDemoSession, () => null)
}
