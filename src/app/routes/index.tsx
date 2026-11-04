import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { OverviewPage, overviewSearchDefaults, overviewSearchSchema } from '@/pages/overview'

export const Route = createFileRoute('/')({
  validateSearch: overviewSearchSchema,
  search: { middlewares: [stripSearchParams(overviewSearchDefaults)] },
  component: function OverviewRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <OverviewPage
        search={search}
        onSearchChange={(patch, options) => {
          void navigate({
            search: (previous) => ({ ...previous, ...patch }),
            replace: options?.replace ?? false,
            resetScroll: false,
          })
        }}
      />
    )
  },
})
