import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, FolderKanban, Gauge, Plus } from 'lucide-react'
import { projectsQueryOptions } from '@/entities/project'
import { NumberDisplay } from '@/features/number-motion'
import type { NumberFormatOptions } from '@/shared/lib/format'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { ProjectEditorDialog } from '@/features/project-editor'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { ProjectTable } from '@/widgets/project-table'

const countFormat = { maximumFractionDigits: 0 }
const progressFormat = { style: 'percent', maximumFractionDigits: 0 } satisfies NumberFormatOptions

export function ProjectsPage() {
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
      <HStack justify="between" wrap className="gap-4">
        <VStack align="stretch" className="gap-1.5">
          <HStack className="gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{t('common.projects')}</h1>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {t('common.workspace')}
            </Badge>
          </HStack>
          <p className="text-sm text-muted-foreground">{t('projects.description')}</p>
        </VStack>
        <Button
          onClick={() => {
            setIsCreateOpen(true)
          }}
        >
          <Plus aria-hidden="true" /> {t('common.newProject')}
        </Button>
      </HStack>

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
        projects={projects}
        isLoading={isLoading}
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
