import { useCallback } from 'react'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { UsersPage } from '@/pages/users'
import { usersSearchDefaults, usersSearchSchema, type UsersSearch } from '@/pages/users/search'
import type { SearchChange } from '@/shared/lib/search-params'
import { DemoSessionBoundary } from '../demo-access/session-boundary'
import { requireDemoSession } from '../demo-access/guard'

export const Route = createFileRoute('/users')({
  validateSearch: usersSearchSchema,
  search: { middlewares: [stripSearchParams(usersSearchDefaults)] },
  beforeLoad: ({ location }) => {
    requireDemoSession(location.href)
  },
  component: function UsersRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const onSearchChange = useCallback<SearchChange<UsersSearch>>(
      (patch, options) => {
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace: options?.replace,
          resetScroll: false,
        })
      },
      [navigate],
    )
    return (
      <DemoSessionBoundary>
        {() => <UsersPage search={search} onSearchChange={onSearchChange} />}
      </DemoSessionBoundary>
    )
  },
})
