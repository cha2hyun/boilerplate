import { env } from '@/shared/config'
import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Circle, FolderKanban, Gauge, Plus } from 'lucide-react'
import { projectsQueryOptions } from '@/entities/project'
import { NumberDisplay } from '@/features/number-motion'
import type { NumberFormatOptions } from '@/shared/lib/format'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { ProjectEditorDialog } from '@/features/project-editor'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { MetricCard } from '@/shared/ui/metric-card'
import { HStack, VStack } from '@/shared/ui/stack'
import { cn } from '@/shared/lib/utils'
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
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const summaryId = useId()
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
    <VStack data-slot="page-content" align="stretch" className="min-w-0 gap-6">
      <PageHeader
        title={t('common.projects')}
        description={t(
          env.dataSource === 'demo' ? 'projects.demoDescription' : 'projects.description',
        )}
        badgeLabel={env.dataSource === 'demo' ? t('common.sample') : undefined}
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

      <VStack align="stretch" className="gap-3">
        <HStack justify="between" wrap className="gap-2 md:hidden">
          <p className="text-sm text-muted-foreground">
            {hasData
              ? t('table.count', {
                  count: projects.length,
                  formattedCount: formatNumber(projects.length),
                })
              : t(isLoading ? 'table.loading' : 'table.unavailable')}
          </p>
          <Button
            variant="outline"
            size="sm"
            aria-expanded={summaryExpanded}
            aria-controls={summaryId}
            onClick={() => {
              setSummaryExpanded((value) => !value)
            }}
          >
            {t(summaryExpanded ? 'projects.hideSummary' : 'projects.showSummary')}
          </Button>
        </HStack>
        <div
          id={summaryId}
          className={cn('gap-4 md:grid md:grid-cols-3', summaryExpanded ? 'grid' : 'hidden')}
        >
          {summaries.map(({ title, value, format, description, Icon }) => (
            <MetricCard
              key={title}
              label={title}
              icon={Icon}
              loading={isLoading}
              value={
                hasData ? (
                  <NumberDisplay animate wrap value={value} format={format} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
              footer={description}
            />
          ))}
        </div>
      </VStack>

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
