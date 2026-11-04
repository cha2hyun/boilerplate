import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { InboxPage, inboxSearchDefaults, inboxSearchSchema } from '@/pages/inbox'

export const Route = createFileRoute('/inbox')({
  validateSearch: inboxSearchSchema,
  search: { middlewares: [stripSearchParams(inboxSearchDefaults)] },
  component: function InboxRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()

    return (
      <InboxPage
        search={search}
        onSearchChange={(patch, options) => {
          void navigate({
            search: (previous) => ({ ...previous, ...patch }),
            replace: options?.replace,
            resetScroll: false,
          })
        }}
      />
    )
  },
})
