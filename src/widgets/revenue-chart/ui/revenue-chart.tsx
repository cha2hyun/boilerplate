import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { selectRecentRevenue, type Analytics } from '@/entities/analytics'
import { MoneyDisplay, NumberDisplay } from '@/features/number-motion'
import { useFormatters, useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { revenueChartSearchSchema, type RevenueChartSearch } from '../model/search'
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
import { HStack, VStack } from '@/shared/ui/stack'

interface RevenueChartProps {
  search: RevenueChartSearch
  onSearchChange: SearchChange<RevenueChartSearch>
  data?: Analytics['revenue']
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}
export function RevenueChart({
  search,
  onSearchChange,
  data,
  isLoading = false,
  error,
  onRetry,
}: RevenueChartProps) {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatMoney, formatDate } = useFormatters()
  const currency = useLocalePreferences((state) => state.currency)
  const config = {
    revenue: { label: t('revenue.thisPeriod'), color: 'var(--chart-2)' },
    previousRevenue: { label: t('revenue.previousPeriod'), color: 'var(--chart-1)' },
  } satisfies ChartConfig
  const { period } = search
  const visible = selectRecentRevenue(data ?? [], Number(period))
  const firstDate = visible[0]?.date
  const lastDate = visible.at(-1)?.date
  const total = visible.reduce((sum, point) => sum + point.revenue, 0)
  const previous = visible.reduce((sum, point) => sum + point.previousRevenue, 0)
  const change = previous > 0 ? ((total - previous) / previous) * 100 : 0
  return (
    <Card className="min-w-0 shadow-xs" aria-label={t('revenue.title')} aria-busy={isLoading}>
      <CardHeader className="gap-1">
        <CardTitle>{t('revenue.title')}</CardTitle>
        <CardDescription>{t('revenue.description')}</CardDescription>
        <CardAction>
          <Select
            value={period}
            onValueChange={(value) => {
              onSearchChange({ period: revenueChartSearchSchema.shape.period.parse(value) })
            }}
            disabled={!data}
          >
            <SelectTrigger aria-label={t('revenue.period')} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">
                {t('revenue.lastDays', { count: 30, formattedCount: formatNumber(30) })}
              </SelectItem>
              <SelectItem value="14">
                {t('revenue.lastDays', { count: 14, formattedCount: formatNumber(14) })}
              </SelectItem>
              <SelectItem value="7">
                {t('revenue.lastDays', { count: 7, formattedCount: formatNumber(7) })}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <VStack asChild align="stretch" className="gap-6">
        <CardContent>
          <HStack wrap className="min-h-9 min-w-0 gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-32" aria-hidden="true" />
                <Skeleton className="h-5.5 w-16 rounded-full" aria-hidden="true" />
              </>
            ) : data ? (
              <>
                <MoneyDisplay
                  animate
                  value={total}
                  format={{ maximumFractionDigits: 0 }}
                  className="text-3xl font-semibold tracking-tight"
                />
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="size-3" />
                  <NumberDisplay
                    animate
                    value={change}
                    format={{
                      style: 'percent',
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                      signDisplay: 'always',
                    }}
                  />
                </Badge>
              </>
            ) : (
              <span className="text-3xl font-semibold text-muted-foreground">—</span>
            )}
          </HStack>
          <div className="h-60 w-full shrink-0">
            {isLoading ? (
              <Skeleton
                className="h-full w-full"
                role="status"
                aria-label={t('revenue.loadingLabel')}
              />
            ) : error && !data ? (
              <HStack className="h-full">
                <Alert variant="destructive">
                  <AlertTitle>{t('revenue.errorTitle')}</AlertTitle>
                  <AlertDescription>
                    <p>{t('revenue.errorDescription')}</p>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        {t('common.retry')}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </HStack>
            ) : visible.length === 0 ? (
              <HStack
                justify="center"
                className="h-full text-sm text-muted-foreground"
                role="status"
              >
                {t('revenue.empty')}
              </HStack>
            ) : (
              <ChartContainer config={config} className="aspect-auto h-60 w-full">
                <AreaChart
                  accessibilityLayer
                  aria-label={t('revenue.chartLabel')}
                  data={visible}
                  margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillPrevious" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-previousRevenue)"
                        stopOpacity={0.25}
                      />
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
                        valueFormatter={(value: number | null | undefined) =>
                          formatMoney(value, { maximumFractionDigits: 0 })
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
      </VStack>
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <span className="block h-4 min-w-0 truncate">
          {isLoading
            ? t('revenue.loading')
            : firstDate && lastDate
              ? t('revenue.dateRange', {
                  start: formatDate(firstDate),
                  end: formatDate(lastDate),
                  currency,
                })
              : t('revenue.currency', { currency })}
        </span>
      </CardFooter>
    </Card>
  )
}
