import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { endDemoSession, getDemoSession } from '@/features/demo-session'
import { LoginPage } from '@/pages/login'
import { env } from '@/shared/config'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { VStack } from '@/shared/ui/stack'
import { demoDestination, loginSearchSchema } from '../demo-access/destination'

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ location, search }) => {
    if (env.dataSource === 'demo' && !location.state.demoSignOut && getDemoSession()) {
      redirect({ throw: true, ...demoDestination(search.returnTo), replace: true })
    }
    return { signOutOnEnter: location.state.demoSignOut === true }
  },
  // Mutation belongs to committed navigation: a cancelled unsaved-changes prompt keeps the session.
  onEnter: ({ context }) => {
    if (context.signOutOnEnter) endDemoSession()
  },
  component: function LoginRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const { t } = useTranslation('workspace')
    if (env.dataSource !== 'demo') {
      return (
        <VStack asChild align="stretch" className="mx-auto max-w-lg gap-6 px-4 py-16">
          <main id="main-content">
            <PageHeader title={t('account.signIn')} description={t('account.apiMode')} />
            <Button asChild className="self-start" variant="outline">
              <Link to="/">{t('navigation.overview')}</Link>
            </Button>
          </main>
        </VStack>
      )
    }
    return (
      <LoginPage
        onSignedIn={() => {
          void navigate({ ...demoDestination(search.returnTo), replace: true })
        }}
      />
    )
  },
})
