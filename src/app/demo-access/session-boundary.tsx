import { useRouter } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import { useDemoSession, type DemoSession } from '@/features/demo-session'
import { normalizePagePath } from '@/shared/lib/normalize-page-path'

/** Browsers can restore a document without running route beforeLoad again. */
export function DemoSessionBoundary({
  children,
}: {
  children: (session: DemoSession) => ReactNode
}) {
  const session = useDemoSession()
  const router = useRouter()
  useEffect(() => {
    if (session) return
    const location = router.state.location
    const path = normalizePagePath(location.pathname).toLowerCase()
    // During a transition the previous outlet can render under the new /login location.
    if (path === '/account' || path === '/users') {
      void router.navigate({ to: '/login', search: { returnTo: location.href }, replace: true })
    }
  }, [session, router])
  return session ? children(session) : null
}
