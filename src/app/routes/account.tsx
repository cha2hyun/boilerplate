import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '@/pages/account'
import { DemoSessionBoundary } from '../demo-access/session-boundary'
import { requireDemoSession } from '../demo-access/guard'

export const Route = createFileRoute('/account')({
  beforeLoad: ({ location }) => {
    requireDemoSession(location.href)
  },
  component: function AccountRoute() {
    return (
      <DemoSessionBoundary>{(session) => <AccountPage userId={session.id} />}</DemoSessionBoundary>
    )
  },
})
