import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, FolderKanban, Gauge, Plus } from 'lucide-react'
import { projectsQueryOptions } from '@/entities/project'
import { ProjectEditorDialog } from '@/features/project-editor'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { ProjectTable } from '@/widgets/project-table'

export function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const query = useQuery(projectsQueryOptions())
  const projects = query.data ?? []
  const activeCount = projects.filter((project) => project.status === 'active').length
  const pausedCount = projects.filter((project) => project.status === 'paused').length
  const averageProgress = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
    : 0

  const summaries = [
    {
      title: 'Total projects',
      value: projects.length,
      description: 'Across your workspace',
      Icon: FolderKanban,
    },
    {
      title: 'Active projects',
      value: activeCount,
      description: `${String(pausedCount)} ${pausedCount === 1 ? 'project' : 'projects'} currently paused`,
      Icon: Circle,
    },
    {
      title: 'Average progress',
      value: `${String(averageProgress)}%`,
      description: 'A shared view of how far you’ve come',
      Icon: Gauge,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              Workspace
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Keep the big picture in view. Make the next step count.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreateOpen(true)
          }}
        >
          <Plus aria-hidden="true" /> New project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaries.map(({ title, value, description, Icon }) => (
          <Card key={title} className="gap-3 py-5 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-1 px-5">
              {query.isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {query.isError ? '—' : value}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectTable
        projects={projects}
        isLoading={query.isPending}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
      <ProjectEditorDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
