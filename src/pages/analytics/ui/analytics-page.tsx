import { useState } from 'react'
import { Activity, Eye, MousePointer2, Users } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { formatDate, formatNumber, formatPercent } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/badge'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { getSampleTraffic, type TrafficPeriod } from '../model/sample-traffic'

const trafficConfig = {
  visitors: { label: 'Visitors', color: 'var(--chart-1)' },
  sessions: { label: 'Sessions', color: 'var(--chart-3)' },
} satisfies ChartConfig
const deviceConfig = {
  sessions: { label: 'Sessions', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function AnalyticsPage() {
  const [period, setPeriod] = useState<TrafficPeriod>('30')
  const data = getSampleTraffic(period)
  const firstDate = data.days[0]?.date
  const lastDate = data.days.at(-1)?.date
  const range = `${firstDate ? formatDate(firstDate) : ''} – ${lastDate ? formatDate(lastDate) : ''}, 2026`
  const metrics = [
    {
      label: 'Visitors',
      value: formatNumber(data.visitors),
      detail: 'Sum of daily sample visitors',
      icon: Users,
    },
    {
      label: 'Sessions',
      value: formatNumber(data.sessions),
      detail: 'Visits across all traffic sources',
      icon: MousePointer2,
    },
    {
      label: 'Page views',
      value: formatNumber(data.pageViews),
      detail: 'Pages viewed across all sessions',
      icon: Eye,
    },
    {
      label: 'Bounce rate',
      value: formatPercent(data.bounceRate),
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

      <p className="text-xs text-muted-foreground" role="status">
        {range} · Fixed sample data for the selected period.
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="gap-4 shadow-xs" aria-label={metric.label}>
            <CardHeader className="gap-2">
              <CardDescription className="text-xs font-medium">{metric.label}</CardDescription>
              <CardAction>
                <metric.icon className="size-4 text-muted-foreground" />
              </CardAction>
              <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
                {metric.value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">{metric.detail}</CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle>Audience overview</CardTitle>
            <CardDescription>
              Visitors and sessions over the selected {period} days.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
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
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle>Sessions by device</CardTitle>
            <CardDescription>How your audience visits your site.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={deviceConfig}
              className="aspect-auto h-48 w-full"
              aria-label="Sessions by desktop, mobile, and tablet"
            >
              <BarChart
                accessibilityLayer
                data={data.devices}
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
            <dl className="mt-3 space-y-3 text-sm">
              {data.devices.map((device) => (
                <div key={device.device} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{device.device}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatNumber(device.sessions)}{' '}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {formatPercent((device.sessions / data.sessions) * 100, 0)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle>Traffic sources</CardTitle>
            <CardDescription>Where your sessions come from.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table aria-label="Traffic sources">
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sources.map((source) => (
                  <TableRow key={source.source}>
                    <TableCell className="font-medium">{source.source}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(source.sessions)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatPercent(source.share)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-xs">
          <CardHeader>
            <CardTitle>Top pages</CardTitle>
            <CardDescription>The pages your audience explores most.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table aria-label="Top pages">
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pages.map((page) => (
                  <TableRow key={page.path}>
                    <TableCell className="font-medium">{page.path}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(page.views)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatPercent(page.share)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
