import { lazy, Suspense } from 'react'
import { Outlet } from '@tanstack/react-router'
import { AppShell } from '@/widgets/app-shell'
import { DocumentHead } from '../seo/document-head'
const Devtools = import.meta.env.DEV ? lazy(() => import('./devtools')) : () => null
export function RootLayout() {
  return (
    <>
      <DocumentHead />
      <AppShell>
        <Outlet />
      </AppShell>
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  )
}
