import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { AnalyticsPage, analyticsSearchDefaults, analyticsSearchSchema } from '@/pages/analytics'

export const Route = createFileRoute('/analytics')({
  validateSearch: analyticsSearchSchema,
  search: { middlewares: [stripSearchParams(analyticsSearchDefaults)] },
  component: function AnalyticsRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()

    return (
      <AnalyticsPage
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
