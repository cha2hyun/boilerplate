import { redirect } from '@tanstack/react-router'
import { getDemoSession } from '@/features/demo-session'
import { env } from '@/shared/config'

export function requireDemoSession(href: string) {
  if (env.dataSource !== 'demo' || !getDemoSession()) {
    redirect({ throw: true, to: '/login', search: { returnTo: href }, replace: true })
  }
}

declare module '@tanstack/react-router' {
  interface HistoryState {
    demoSignOut?: boolean
  }
}
