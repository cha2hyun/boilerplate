import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { ProjectsPage, projectsSearchDefaults, projectsSearchSchema } from '@/pages/projects'

export const Route = createFileRoute('/projects')({
  validateSearch: projectsSearchSchema,
  search: { middlewares: [stripSearchParams(projectsSearchDefaults)] },
  component: function ProjectsRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <ProjectsPage
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
