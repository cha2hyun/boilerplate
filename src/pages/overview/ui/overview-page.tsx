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
import { ProjectEditorDialog } from '@/features/project-editor'
import { ProjectTable } from '@/widgets/project-table'
import { RevenueChart } from '@/widgets/revenue-chart'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/shared/lib/format'
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
import { OverviewAnalyticsSkeleton } from './overview-analytics-skeleton'

const kpiIcons = [DollarSign, Users, ShoppingBag, MousePointer2]
const activityIcons = { project: FolderKanban, member: Users, billing: CreditCard }
export function OverviewPage() {
  const analytics = useQuery(analyticsQueryOptions())
  const projects = useQuery(projectsQueryOptions())
  const [createOpen, setCreateOpen] = useState(false)
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-foreground" />
            WORKSPACE OVERVIEW
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            A little clarity. A lot of possibility.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back. Here's what's happening with your workspace.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true)
          }}
        >
          <Plus />
          New project
        </Button>
      </div>
      {analytics.isError && (
        <Alert variant="destructive">
          <AlertTitle>Analytics couldn't load</AlertTitle>
          <AlertDescription>
            <p>{analytics.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void analytics.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {analytics.isPending ? (
        <OverviewAnalyticsSkeleton />
      ) : (
        analytics.data && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {analytics.data.kpis.map((kpi, index) => {
                const Icon = kpiIcons[index] ?? DollarSign
                const Trend = kpi.change >= 0 ? ArrowUpRight : ArrowDownRight
                return (
                  <Card key={kpi.id} className="gap-4 shadow-xs">
                    <CardHeader className="gap-2">
                      <CardDescription className="text-xs font-medium">{kpi.label}</CardDescription>
                      <CardAction>
                        <Icon className="size-4 text-muted-foreground" />
                      </CardAction>
                      <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
                        {kpi.format === 'currency'
                          ? formatCurrency(kpi.value)
                          : kpi.format === 'percent'
                            ? formatPercent(kpi.value, 2)
                            : formatNumber(kpi.value)}
                      </CardTitle>
                    </CardHeader>
                    <CardFooter className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="gap-0.5 text-[11px]">
                        <Trend className="size-3" />
                        {kpi.change > 0 ? '+' : ''}
                        {kpi.change}
                        {kpi.format === 'percent' ? ' pp' : '%'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {kpi.description.replace('percentage points ', '')}
                      </span>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
            <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <RevenueChart data={analytics.data.revenue} />
              <Card className="gap-5 shadow-xs">
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>The latest from your workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {analytics.data.activity.slice(0, 5).map((activity) => {
                    const Icon = activityIcons[activity.type]
                    return (
                      <div key={activity.id} className="flex gap-3">
                        <Avatar className="size-9 rounded-lg">
                          <AvatarFallback className="rounded-lg">
                            <Icon className="size-4 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm leading-snug font-medium">{activity.title}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {activity.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatRelativeTime(activity.time)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
                <CardFooter className="mt-auto border-t pt-4">
                  <Button asChild variant="ghost" size="sm" className="w-full justify-between">
                    <Link to="/projects">
                      Explore projects
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        )
      )}
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
            <Link to="/projects">
              View all projects
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
        <ProjectTable
          projects={projects.data ?? []}
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
