import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, FolderKanban, Gauge, Plus } from 'lucide-react'
import { projectsQueryOptions } from '@/entities/project'
import { NumberDisplay } from '@/features/number-motion'
import type { NumberFormatOptions } from '@/shared/lib/format'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { ProjectEditorDialog } from '@/features/project-editor'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { PageHeader } from '@/shared/ui/page-header'
import { HStack, VStack } from '@/shared/ui/stack'
import { ProjectTable, type ProjectTableSearch } from '@/widgets/project-table'

const countFormat = { maximumFractionDigits: 0 }
const progressFormat = { style: 'percent', maximumFractionDigits: 0 } satisfies NumberFormatOptions

interface ProjectsPageProps {
  search: ProjectTableSearch
  onSearchChange: SearchChange<ProjectTableSearch>
}

export function ProjectsPage({ search, onSearchChange }: ProjectsPageProps) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useFormatters()
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
      title: t('projects.total'),
      value: projects.length,
      format: countFormat,
      description: t('projects.across'),
      Icon: FolderKanban,
    },
    {
      title: t('projects.active'),
      value: activeCount,
      format: countFormat,
      description: hasData
        ? t('projects.pausedCount', {
            count: pausedCount,
            formattedCount: formatNumber(pausedCount),
          })
        : t('projects.pausedDescription'),
      Icon: Circle,
    },
    {
      title: t('projects.progress'),
      value: averageProgress,
      format: progressFormat,
      description: t('projects.progressDescription'),
      Icon: Gauge,
    },
  ]

  return (
    <VStack align="stretch" className="gap-6">
      <PageHeader
        title={t('common.projects')}
        description={t('projects.description')}
        badgeLabel={t('common.workspace')}
        actions={
          <Button
            onClick={() => {
              setIsCreateOpen(true)
            }}
          >
            <Plus aria-hidden="true" /> {t('common.newProject')}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {summaries.map(({ title, value, format, description, Icon }) => (
          <Card
            key={title}
            className="gap-3 py-5 shadow-none"
            aria-label={title}
            aria-busy={isLoading}
          >
            <HStack asChild justify="between" className="px-5">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
            </HStack>
            <VStack asChild align="stretch" className="gap-1 px-5">
              <CardContent>
                <HStack className="h-9 text-3xl font-semibold tracking-tight tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : hasData ? (
                    <NumberDisplay animate value={value} format={format} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </HStack>
                <p className="min-h-8 text-xs leading-4 text-muted-foreground">{description}</p>
              </CardContent>
            </VStack>
          </Card>
        ))}
      </div>

      <ProjectTable
        search={search}
        onSearchChange={onSearchChange}
        projects={projects}
        isLoading={isLoading}
        isFetching={query.isFetching}
        hasData={hasData}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
      <ProjectEditorDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </VStack>
  )
}
