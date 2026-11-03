import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Eye, MousePointer2, Users } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { trafficQueryOptions, type TrafficPeriod } from '@/entities/traffic'
import { AnimatedNumber } from '@/features/number-motion'
import { formatDate, formatNumber, formatPercent } from '@/shared/lib/format'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const formatCount = (value: number) => formatNumber(value, { maximumFractionDigits: 0 })

const trafficConfig = {
  visitors: { label: 'Visitors', color: 'var(--chart-1)' },
  sessions: { label: 'Sessions', color: 'var(--chart-3)' },
} satisfies ChartConfig
const deviceConfig = {
  sessions: { label: 'Sessions', color: 'var(--chart-1)' },
} satisfies ChartConfig
const deviceColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'] as const

export function AnalyticsPage() {
  const [period, setPeriod] = useState<TrafficPeriod>('30')
  const traffic = useQuery(trafficQueryOptions(period))
  const data = traffic.data
  const isLoading = traffic.isPending && !data
  const firstDate = data?.days[0]?.date
  const lastDate = data?.days.at(-1)?.date
  const range = `${firstDate ? formatDate(firstDate) : ''} – ${lastDate ? formatDate(lastDate) : ''}, 2026`
  const metrics = [
    {
      label: 'Visitors',
      value: data?.visitors,
      format: formatCount,
      detail: 'Sum of daily sample visitors',
      icon: Users,
    },
    {
      label: 'Sessions',
      value: data?.sessions,
      format: formatCount,
      detail: 'Visits across all traffic sources',
      icon: MousePointer2,
    },
    {
      label: 'Page views',
      value: data?.pageViews,
      format: formatCount,
      detail: 'Pages viewed across all sessions',
      icon: Eye,
    },
    {
      label: 'Bounce rate',
      value: data?.bounceRate,
      format: formatPercent,
      detail: 'Sessions with a single page view',
      icon: Activity,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
            <Badge variant="secondary">Sample</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Understand your audience and where they find you.
          </p>
        </div>
        <Select
          value={period}
          onValueChange={(value) => {
            if (value === '7' || value === '14' || value === '30') setPeriod(value)
          }}
        >
          <SelectTrigger aria-label="Analytics period" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex h-8 items-center text-xs text-muted-foreground" role="status">
        {isLoading
          ? 'Loading sample analytics…'
          : data
            ? `${range} · Fixed sample data for the selected period.`
            : 'Sample analytics are unavailable.'}
      </div>

      {traffic.isError && (
        <Alert variant="destructive">
          <AlertTitle>Analytics couldn't {data ? 'refresh' : 'load'}</AlertTitle>
          <AlertDescription>
            <p>{traffic.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void traffic.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className="gap-4 shadow-xs"
            aria-label={metric.label}
            aria-busy={isLoading}
          >
            <CardHeader className="gap-2">
              <CardDescription className="text-xs font-medium">{metric.label}</CardDescription>
              <CardAction>
                <metric.icon className="size-4 text-muted-foreground" />
              </CardAction>
              <CardTitle className="flex h-9 items-center text-3xl font-semibold tracking-tight tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : metric.value !== undefined ? (
                  <AnimatedNumber value={metric.value} format={metric.format} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">{metric.detail}</CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>Audience overview</CardTitle>
            <CardDescription>
              Visitors and sessions over the selected {period} days.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {isLoading ? (
              <Skeleton className="h-72 w-full" aria-label="Loading audience chart" />
            ) : data?.days.length ? (
              <ChartContainer
                config={trafficConfig}
                className="aspect-auto h-72 w-full"
                aria-label="Daily visitors and sessions"
              >
                <AreaChart
                  accessibilityLayer
                  data={data.days}
                  margin={{ left: 8, right: 8, top: 10 }}
                >
                  <defs>
                    <linearGradient id="analyticsVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0.02} />
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
                        labelFormatter={(value) => formatDate(String(value))}
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
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                {traffic.isError ? 'Audience data unavailable' : 'No audience data'}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>Sessions by device</CardTitle>
            <CardDescription>How your audience visits your site.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" aria-label="Loading device chart" />
            ) : data?.devices.length ? (
              <ChartContainer
                config={deviceConfig}
                className="aspect-auto h-48 w-full"
                aria-label="Sessions by desktop, mobile, and tablet"
              >
                <BarChart
                  accessibilityLayer
                  data={data.devices.map(({ device, sessions }, index) => ({
                    device,
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
                    width={65}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="sessions" radius={4} maxBarSize={32} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {traffic.isError ? 'Device data unavailable' : 'No device data'}
              </div>
            )}
            <dl className="mt-3 space-y-3 text-sm">
              {Array.from({ length: 3 }, (_, index) => {
                const device = data?.devices[index]
                return (
                  <div
                    key={device?.device ?? index}
                    className="flex h-5 items-center justify-between gap-3"
                  >
                    <dt className="text-muted-foreground">
                      {device?.device ?? (isLoading ? <Skeleton className="h-4 w-16" /> : '—')}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {isLoading ? (
                        <Skeleton className="h-4 w-24" />
                      ) : device ? (
                        <>
                          <AnimatedNumber value={device.sessions} format={formatCount} />{' '}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {formatPercent(
                              data.sessions > 0 ? (device.sessions / data.sessions) * 100 : 0,
                              0,
                            )}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>Traffic sources</CardTitle>
            <CardDescription>Where your sessions come from.</CardDescription>
          </CardHeader>
          <CardContent className="h-60 overflow-y-auto">
            <Table aria-label="Traffic sources" aria-busy={isLoading} className="table-fixed">
              <colgroup>
                <col className="w-1/2" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Share</TableHead>
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
                      <TableCell className="truncate font-medium">{source.source}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(source.sessions)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatPercent(source.share)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="h-50">
                    <TableCell
                      colSpan={3}
                      className="text-center whitespace-normal text-muted-foreground"
                    >
                      {traffic.isError ? 'Traffic sources unavailable' : 'No traffic sources yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-xs" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>Top pages</CardTitle>
            <CardDescription>The pages your audience explores most.</CardDescription>
          </CardHeader>
          <CardContent className="h-60 overflow-y-auto">
            <Table aria-label="Top pages" aria-busy={isLoading} className="table-fixed">
              <colgroup>
                <col className="w-1/2" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Share</TableHead>
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
                      <TableCell className="truncate font-medium">{page.path}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(page.views)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatPercent(page.share)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="h-50">
                    <TableCell
                      colSpan={3}
                      className="text-center whitespace-normal text-muted-foreground"
                    >
                      {traffic.isError ? 'Top pages unavailable' : 'No top pages yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
