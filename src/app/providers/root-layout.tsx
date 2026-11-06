import { lazy, Suspense } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { normalizePagePath } from '@/shared/lib/normalize-page-path'
import { AppShell } from '@/widgets/app-shell'
import { DocumentHead } from '../seo/document-head'
import { CurrencyProvider } from './currency-provider'
const Devtools = import.meta.env.DEV ? lazy(() => import('./devtools')) : () => null
export function RootLayout() {
  const isLogin = useRouterState({
    select: (state) => normalizePagePath(state.location.pathname).toLowerCase() === '/login',
  })
  return (
    <>
      <DocumentHead />
      {isLogin ? (
        <Outlet />
      ) : (
        <CurrencyProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </CurrencyProvider>
      )}
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  )
}
