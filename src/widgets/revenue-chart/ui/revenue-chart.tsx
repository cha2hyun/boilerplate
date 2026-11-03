import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { Analytics } from '@/entities/analytics'
import { AnimatedNumber } from '@/features/number-motion'
import { formatCurrency, formatDate } from '@/shared/lib/format'
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

const config = {
  revenue: { label: 'This period', color: 'var(--chart-2)' },
  previousRevenue: { label: 'Previous period', color: 'var(--chart-1)' },
} satisfies ChartConfig
interface RevenueChartProps {
  data?: Analytics['revenue']
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}
export function RevenueChart({ data, isLoading = false, error, onRetry }: RevenueChartProps) {
  const [period, setPeriod] = useState('30')
  const visible = (data ?? []).slice(-Number(period))
  const firstDate = visible[0]?.date
  const lastDate = visible.at(-1)?.date
  const total = visible.reduce((sum, point) => sum + point.revenue, 0)
  const previous = visible.reduce((sum, point) => sum + point.previousRevenue, 0)
  const change = previous > 0 ? ((total - previous) / previous) * 100 : 0
  return (
    <Card className="h-full min-w-0 shadow-xs" aria-label="Revenue overview" aria-busy={isLoading}>
      <CardHeader className="gap-1">
        <CardTitle>Revenue overview</CardTitle>
        <CardDescription>How your business is performing over time.</CardDescription>
        <CardAction>
          <Select value={period} onValueChange={setPeriod} disabled={!data}>
            <SelectTrigger aria-label="Revenue period" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex h-9 min-w-0 items-center gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-9 w-32" aria-hidden="true" />
              <Skeleton className="h-5.5 w-16 rounded-full" aria-hidden="true" />
            </>
          ) : data ? (
            <>
              <AnimatedNumber
                value={total}
                format={formatCurrency}
                className="text-3xl font-semibold tracking-tight"
              />
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="size-3" />
                <AnimatedNumber
                  value={change}
                  format={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}
                />
              </Badge>
            </>
          ) : (
            <span className="text-3xl font-semibold text-muted-foreground">—</span>
          )}
        </div>
        <div className="h-60 w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full" role="status" aria-label="Loading revenue" />
          ) : error && !data ? (
            <div className="flex h-full items-center">
              <Alert variant="destructive">
                <AlertTitle>Revenue couldn't load</AlertTitle>
                <AlertDescription>
                  <p>Try loading the revenue data again.</p>
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      Try again
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : visible.length === 0 ? (
            <div
              className="flex h-full items-center justify-center text-sm text-muted-foreground"
              role="status"
            >
              No revenue data for this period.
            </div>
          ) : (
            <ChartContainer
              config={config}
              className="aspect-auto h-60 w-full"
              aria-label="Revenue compared with previous period"
            >
              <AreaChart
                accessibilityLayer
                data={visible}
                margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillPrevious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-previousRevenue)" stopOpacity={0.25} />
                    <stop
                      offset="95%"
                      stopColor="var(--color-previousRevenue)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={40}
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
                  dataKey="previousRevenue"
                  type="monotone"
                  fill="url(#fillPrevious)"
                  stroke="var(--color-previousRevenue)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  fill="url(#fillRevenue)"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                />
                <ChartLegend position="bottom" content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <span className="block h-4 min-w-0 truncate">
          {isLoading
            ? 'Loading revenue…'
            : firstDate && lastDate
              ? `${formatDate(firstDate)} – ${formatDate(lastDate)} · Revenue in USD`
              : 'Revenue in USD'}
        </span>
      </CardFooter>
    </Card>
  )
}
