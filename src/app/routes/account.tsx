import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '@/pages/account'
import { useDemoSession } from '@/features/demo-session'
import { requireDemoSession } from '../demo-access/guard'

export const Route = createFileRoute('/account')({
  beforeLoad: ({ location }) => {
    requireDemoSession(location.href)
  },
  component: function AccountRoute() {
    const session = useDemoSession()
    return session && <AccountPage userId={session.id} />
  },
})
