import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  FolderKanban,
  MousePointer2,
  Plus,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { analyticsQueryOptions } from '@/entities/analytics'
import { projectsQueryOptions } from '@/entities/project'
import { MoneyDisplay, NumberDisplay } from '@/features/number-motion'
import { ProjectEditorDialog } from '@/features/project-editor'
import { ProjectTable } from '@/widgets/project-table'
import { RevenueChart } from '@/widgets/revenue-chart'
import { useErrorMessage, useFormatters, useTranslation } from '@/shared/lib/i18n'
import { env } from '@/shared/config'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

const countFormat = { maximumFractionDigits: 0 }

const kpiCards = [
  {
    id: 'revenue',
    label: 'overview.revenue',
    description: 'overview.previous30Days',
    Icon: DollarSign,
  },
  {
    id: 'customers',
    label: 'overview.customers',
    description: 'overview.previous30Days',
    Icon: Users,
  },
  {
    id: 'orders',
    label: 'overview.orders',
    description: 'overview.previous30Days',
    Icon: ShoppingBag,
  },
  {
    id: 'conversion',
    label: 'overview.conversion',
    description: 'overview.priorPeriod',
    Icon: MousePointer2,
  },
] as const
const demoActivity = {
  act_1: { title: 'overview.activity1Title', description: 'overview.activity1Description' },
  act_2: { title: 'overview.activity2Title', description: 'overview.activity2Description' },
  act_3: { title: 'overview.activity3Title', description: 'overview.activity3Description' },
  act_4: { title: 'overview.activity4Title', description: 'overview.activity4Description' },
} as const
const activityIcons = { project: FolderKanban, member: Users, billing: CreditCard }
export function OverviewPage() {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatMoney, formatRelativeTime } = useFormatters()
  const errorMessage = useErrorMessage()
  const analytics = useQuery(analyticsQueryOptions())
  const projects = useQuery(projectsQueryOptions())
  const isLoading = analytics.isPending && !analytics.data
  const [createOpen, setCreateOpen] = useState(false)
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-foreground" />
            {t('overview.eyebrow')}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('overview.title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('overview.description')}</p>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true)
          }}
        >
          <Plus />
          {t('common.newProject')}
        </Button>
      </div>
      {analytics.isError && (
        <Alert variant="destructive">
          <AlertTitle>{t('overview.errorTitle')}</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(analytics.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void analytics.refetch()}>
              {t('common.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ id, label, description, Icon }) => {
          const kpi = analytics.data?.kpis.find((item) => item.id === id)
          const Trend = (kpi?.change ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight
          return (
            <Card key={id} className="gap-4 shadow-xs" aria-label={t(label)} aria-busy={isLoading}>
              <CardHeader className="gap-2">
                <CardDescription className="text-xs font-medium">{t(label)}</CardDescription>
                <CardAction>
                  <Icon className="size-4 text-muted-foreground" />
                </CardAction>
                <CardTitle className="flex h-9 items-center text-3xl font-semibold tracking-tight tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : kpi ? (
                    kpi.format === 'currency' ? (
                      <MoneyDisplay
                        animate
                        value={kpi.value}
                        className="text-2xl 2xl:text-3xl"
                        format={{ maximumFractionDigits: 0 }}
                      />
                    ) : (
                      <NumberDisplay
                        animate
                        value={kpi.value}
                        format={
                          kpi.format === 'percent'
                            ? { style: 'percent', maximumFractionDigits: 2 }
                            : countFormat
                        }
                      />
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardFooter className="grid min-h-8 grid-cols-[5rem_minmax(0,1fr)] items-start gap-2">
                {isLoading ? (
                  <Skeleton className="h-5.5 w-20 rounded-full" />
                ) : kpi ? (
                  <Badge variant="secondary" className="justify-center gap-0.5 text-[11px]">
                    <Trend className="size-3" />
                    {formatNumber(kpi.change, {
                      style: kpi.format === 'percent' ? 'decimal' : 'percent',
                      maximumFractionDigits: 3,
                      signDisplay: 'exceptZero',
                    })}
                    {kpi.format === 'percent' ? t('overview.percentagePoints') : ''}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('overview.noData')}</span>
                )}
                <span className="text-xs text-muted-foreground">{t(description)}</span>
              </CardFooter>
            </Card>
          )
        })}
      </div>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <RevenueChart
          data={analytics.data?.revenue}
          isLoading={isLoading}
          error={analytics.error}
          onRetry={() => void analytics.refetch()}
        />
        <Card className="gap-5 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>{t('overview.activity')}</CardTitle>
            <CardDescription>{t('overview.activityDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="h-114 space-y-6 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex h-24 gap-3" aria-hidden="true">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </div>
              ))
            ) : analytics.data?.activity.length ? (
              analytics.data.activity.slice(0, 5).map((activity) => {
                const Icon = activityIcons[activity.type]
                return (
                  <div key={activity.id} className="flex h-24 gap-3">
                    <Avatar className="size-9 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        <Icon className="size-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-2 text-sm leading-5 font-medium">
                        {env.dataSource === 'demo' && activity.id in demoActivity
                          ? t(demoActivity[activity.id as keyof typeof demoActivity].title)
                          : activity.title}
                      </p>
                      <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">
                        {env.dataSource === 'demo' && activity.id in demoActivity
                          ? t(demoActivity[activity.id as keyof typeof demoActivity].description, {
                              progress: formatNumber(72, {
                                style: 'percent',
                                maximumFractionDigits: 0,
                              }),
                              amount: formatMoney(249),
                            })
                          : activity.description}
                      </p>
                      <p className="text-[11px] leading-4 text-muted-foreground">
                        {formatRelativeTime(activity.time)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t(analytics.isError ? 'overview.activityUnavailable' : 'overview.noActivity')}
              </div>
            )}
          </CardContent>
          <CardFooter className="mt-auto border-t pt-4">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between">
              <Link to="/projects">
                {t('overview.explore')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
            <Link to="/projects">
              {t('overview.viewAll')}
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
        <ProjectTable
          projects={projects.data ?? []}
          hasData={projects.data !== undefined}
          isLoading={projects.isPending}
          error={projects.error}
          onRetry={() => void projects.refetch()}
          compact
        />
      </div>
      <ProjectEditorDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
