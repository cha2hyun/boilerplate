import { useQuery } from '@tanstack/react-query'
import { Activity, Eye, MousePointer2, Users } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { trafficQueryOptions } from '@/entities/traffic'
import { NumberDisplay } from '@/features/number-motion'
import type { NumberFormatOptions } from '@/shared/lib/format'
import { useErrorMessage, useFormatters, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart'
import { PageHeader } from '@/shared/ui/page-header'
import { MetricCard } from '@/shared/ui/metric-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { AnalyticsSearch } from '../model/search'

const countFormat = { maximumFractionDigits: 0 }
const percentFormat = { style: 'percent', maximumFractionDigits: 1 } satisfies NumberFormatOptions

const deviceColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'] as const

interface AnalyticsPageProps {
  search: AnalyticsSearch
  onSearchChange: SearchChange<AnalyticsSearch>
}

export function AnalyticsPage({ search, onSearchChange }: AnalyticsPageProps) {
  const { t } = useTranslation('admin')
  const errorMessage = useErrorMessage()
  const { formatDate, formatNumber } = useFormatters()
  const trafficConfig = {
    visitors: { label: t('analytics.visitors'), color: 'var(--chart-highlight)' },
    sessions: { label: t('analytics.sessions'), color: 'var(--chart-3)' },
  } satisfies ChartConfig
  const deviceConfig = {
    sessions: { label: t('analytics.sessions'), color: 'var(--chart-1)' },
  } satisfies ChartConfig
  const deviceLabels: Record<string, string> = {
    Desktop: t('analytics.devices.Desktop'),
    Mobile: t('analytics.devices.Mobile'),
    Tablet: t('analytics.devices.Tablet'),
  }
  const sourceLabels: Record<string, string> = {
    'Organic search': t('analytics.sources.organic'),
    Direct: t('analytics.sources.direct'),
    Referral: t('analytics.sources.referral'),
    Social: t('analytics.sources.social'),
    Email: t('analytics.sources.email'),
  }
  const { period } = search
  const traffic = useQuery(trafficQueryOptions(period))
  const data = traffic.data
  const isLoading = traffic.isPending && !data
  const firstDate = data?.days[0]?.date
  const lastDate = data?.days.at(-1)?.date
  const range = t('analytics.dateRange', {
    start: firstDate ? formatDate(firstDate) : '',
    end: lastDate ? formatDate(lastDate, { year: 'numeric' }) : '',
  })
  const metrics = [
    {
      label: t('analytics.visitors'),
      value: data?.visitors,
      format: countFormat,
      detail: t('analytics.visitorsHint'),
      icon: Users,
    },
    {
      label: t('analytics.sessions'),
      value: data?.sessions,
      format: countFormat,
      detail: t('analytics.sessionsHint'),
      icon: MousePointer2,
    },
    {
      label: t('analytics.pageViews'),
      value: data?.pageViews,
      format: countFormat,
      detail: t('analytics.pageViewsHint'),
      icon: Eye,
    },
    {
      label: t('analytics.bounceRate'),
      value: data?.bounceRate,
      format: percentFormat,
      detail: t('analytics.bounceRateHint'),
      icon: Activity,
    },
  ]

  return (
    <VStack data-slot="page-content" align="stretch" className="min-w-0 gap-6">
      <PageHeader
        title={t('analytics.title')}
        description={t('analytics.intro')}
        badgeLabel={t('common.sample')}
        actions={
          <Select
            value={period}
            onValueChange={(value) => {
              if (value === '7' || value === '14' || value === '30') {
                onSearchChange({ period: value })
              }
            }}
          >
            <SelectTrigger aria-label={t('analytics.period')} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">
                {t('analytics.lastDays', { days: formatNumber(30) })}
              </SelectItem>
              <SelectItem value="14">
                {t('analytics.lastDays', { days: formatNumber(14) })}
              </SelectItem>
              <SelectItem value="7">
                {t('analytics.lastDays', { days: formatNumber(7) })}
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <HStack className="h-8 text-xs text-muted-foreground" role="status">
        {isLoading
          ? t('analytics.loading')
          : data
            ? t('analytics.rangeHint', { range })
            : t('analytics.unavailable')}
      </HStack>

      {traffic.isError && (
        <Alert variant="destructive">
          <AlertTitle>{t(data ? 'analytics.refreshError' : 'analytics.loadError')}</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(traffic.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void traffic.refetch()}>
              {t('common.tryAgain')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            icon={metric.icon}
            loading={isLoading}
            value={
              metric.value !== undefined ? (
                <NumberDisplay animate wrap value={metric.value} format={metric.format} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
            footer={metric.detail}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle asChild>
              <h2>{t('analytics.audience')}</h2>
            </CardTitle>
            <CardDescription>
              {t('analytics.audienceHint', { days: formatNumber(Number(period)) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {isLoading ? (
              <Skeleton className="h-72 w-full" aria-label={t('analytics.loadingAudience')} />
            ) : data?.days.length ? (
              <ChartContainer config={trafficConfig} className="aspect-auto h-72 w-full">
                <AreaChart
                  accessibilityLayer
                  aria-label={t('analytics.dailyAudience')}
                  data={data.days}
                  margin={{ left: 8, right: 8, top: 10 }}
                >
                  <defs>
                    <linearGradient id="analyticsVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="analyticsSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-sessions)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-sessions)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    minTickGap={36}
                    tickFormatter={(value: string) => formatDate(value)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          typeof value === 'string' && !Number.isNaN(Date.parse(value))
                            ? formatDate(value)
                            : null
                        }
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="sessions"
                    type="monotone"
                    fill="url(#analyticsSessions)"
                    stroke="var(--color-sessions)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="visitors"
                    type="monotone"
                    fill="url(#analyticsVisitors)"
                    stroke="var(--color-visitors)"
                    strokeWidth={2}
                  />
                  <ChartLegend position="bottom" content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <HStack justify="center" className="h-72 text-sm text-muted-foreground">
                {traffic.isError ? t('analytics.audienceUnavailable') : t('analytics.noAudience')}
              </HStack>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle asChild>
              <h2>{t('analytics.deviceSessions')}</h2>
            </CardTitle>
            <CardDescription>{t('analytics.deviceHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" aria-label={t('analytics.loadingDevices')} />
            ) : data?.devices.length ? (
              <ChartContainer config={deviceConfig} className="aspect-auto h-48 w-full">
                <BarChart
                  accessibilityLayer
                  aria-label={t('analytics.deviceChart')}
                  data={data.devices.map(({ device, sessions }, index) => ({
                    device: deviceLabels[device] ?? device,
                    sessions,
                    fill: deviceColors[index % deviceColors.length],
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 8 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="device"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width="auto"
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="sessions" radius={4} maxBarSize={32} />
                </BarChart>
              </ChartContainer>
            ) : (
              <HStack justify="center" className="h-48 text-sm text-muted-foreground">
                {traffic.isError ? t('analytics.devicesUnavailable') : t('analytics.noDevices')}
              </HStack>
            )}
            <VStack asChild align="stretch" className="mt-3 gap-3 text-sm">
              <dl>
                {Array.from({ length: 3 }, (_, index) => {
                  const device = data?.devices[index]
                  return (
                    <HStack
                      wrap
                      justify="between"
                      key={device?.device ?? index}
                      className="min-h-5 min-w-0 gap-x-3 gap-y-1"
                    >
                      <dt className="min-w-0 wrap-anywhere text-muted-foreground">
                        {device ? (
                          (deviceLabels[device.device] ?? device.device)
                        ) : isLoading ? (
                          <Skeleton className="h-4 w-16" />
                        ) : (
                          '—'
                        )}
                      </dt>
                      <HStack
                        asChild
                        wrap
                        className="min-w-0 gap-x-2 gap-y-1 font-medium tabular-nums"
                      >
                        <dd>
                          {isLoading ? (
                            <Skeleton className="h-4 w-24" />
                          ) : device ? (
                            <>
                              <NumberDisplay
                                animate
                                wrap
                                value={device.sessions}
                                format={countFormat}
                              />
                              <span className="text-xs font-normal text-muted-foreground">
                                {formatNumber(
                                  data.sessions > 0 ? (device.sessions / data.sessions) * 100 : 0,
                                  { style: 'percent', maximumFractionDigits: 0 },
                                )}
                              </span>
                            </>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </HStack>
                    </HStack>
                  )
                })}
              </dl>
            </VStack>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle asChild>
              <h2>{t('analytics.trafficSources')}</h2>
            </CardTitle>
            <CardDescription>{t('analytics.sourcesHint')}</CardDescription>
          </CardHeader>
          <CardContent className="h-60 overflow-y-auto">
            <Table
              aria-label={t('analytics.trafficSources')}
              aria-busy={isLoading}
              className="table-fixed"
            >
              <colgroup>
                <col className="w-1/2" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('analytics.source')}</TableHead>
                  <TableHead className="text-right">{t('analytics.sessions')}</TableHead>
                  <TableHead className="text-right">{t('analytics.share')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={index} className="h-10" aria-hidden="true">
                      <TableCell>
                        <Skeleton className="h-4 w-24 max-w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-14 max-w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-12 max-w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.sources.length ? (
                  data.sources.map((source) => (
                    <TableRow key={source.source} className="h-10">
                      <TableCell className="font-medium wrap-anywhere whitespace-normal">
                        {sourceLabels[source.source] ?? source.source}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(source.sessions)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatNumber(source.share, percentFormat)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="h-50">
                    <TableCell
                      colSpan={3}
                      className="text-center whitespace-normal text-muted-foreground"
                    >
                      {traffic.isError
                        ? t('analytics.sourcesUnavailable')
                        : t('analytics.noSources')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle asChild>
              <h2>{t('analytics.topPages')}</h2>
            </CardTitle>
            <CardDescription>{t('analytics.pagesHint')}</CardDescription>
          </CardHeader>
          <CardContent className="h-60 overflow-y-auto">
            <Table
              aria-label={t('analytics.topPages')}
              aria-busy={isLoading}
              className="table-fixed"
            >
              <colgroup>
                <col className="w-1/2" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('analytics.page')}</TableHead>
                  <TableHead className="text-right">{t('analytics.views')}</TableHead>
                  <TableHead className="text-right">{t('analytics.share')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={index} className="h-10" aria-hidden="true">
                      <TableCell>
                        <Skeleton className="h-4 w-24 max-w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-14 max-w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-12 max-w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.pages.length ? (
                  data.pages.map((page) => (
                    <TableRow key={page.path} className="h-10">
                      <TableCell className="font-medium wrap-anywhere whitespace-normal">
                        {page.path}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(page.views)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatNumber(page.share, percentFormat)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="h-50">
                    <TableCell
                      colSpan={3}
                      className="text-center whitespace-normal text-muted-foreground"
                    >
                      {traffic.isError ? t('analytics.pagesUnavailable') : t('analytics.noPages')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </VStack>
  )
}
