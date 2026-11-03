import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, FolderKanban, Gauge, Plus } from 'lucide-react'
import { projectsQueryOptions } from '@/entities/project'
import { NumberDisplay } from '@/features/number-motion'
import { formatNumber, type NumberFormatOptions } from '@/shared/lib/format'
import { ProjectEditorDialog } from '@/features/project-editor'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { ProjectTable } from '@/widgets/project-table'

const countFormat = { maximumFractionDigits: 0 }
const progressFormat = { style: 'percent', maximumFractionDigits: 0 } satisfies NumberFormatOptions

export function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const query = useQuery(projectsQueryOptions())
  const projects = query.data ?? []
  const hasData = query.data !== undefined
  const isLoading = query.isPending && !hasData
  const activeCount = projects.filter((project) => project.status === 'active').length
  const pausedCount = projects.filter((project) => project.status === 'paused').length
  const averageProgress = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
    : 0

  const summaries = [
    {
      title: 'Total projects',
      value: projects.length,
      format: countFormat,
      description: 'Across your workspace',
      Icon: FolderKanban,
    },
    {
      title: 'Active projects',
      value: activeCount,
      format: countFormat,
      description: hasData
        ? `${formatNumber(pausedCount)} ${pausedCount === 1 ? 'project' : 'projects'} currently paused`
        : 'Projects currently paused',
      Icon: Circle,
    },
    {
      title: 'Average progress',
      value: averageProgress,
      format: progressFormat,
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
        {summaries.map(({ title, value, format, description, Icon }) => (
          <Card
            key={title}
            className="gap-3 py-5 shadow-none"
            aria-label={title}
            aria-busy={isLoading}
          >
            <CardHeader className="flex flex-row items-center justify-between px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-1 px-5">
              <div className="flex h-9 items-center text-3xl font-semibold tracking-tight tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : hasData ? (
                  <NumberDisplay animate value={value} format={format} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <p className="min-h-8 text-xs leading-4 text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectTable
        projects={projects}
        isLoading={isLoading}
        hasData={hasData}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
      <ProjectEditorDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
