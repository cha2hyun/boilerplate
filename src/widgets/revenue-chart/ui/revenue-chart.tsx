import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { Analytics } from '@/entities/analytics'
import { formatCurrency, formatDate } from '@/shared/lib/format'
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

const config = {
  revenue: { label: 'This period', color: 'var(--chart-2)' },
  previousRevenue: { label: 'Previous period', color: 'var(--chart-1)' },
} satisfies ChartConfig
interface RevenueChartProps {
  data: Analytics['revenue']
}
export function RevenueChart({ data }: RevenueChartProps) {
  const [period, setPeriod] = useState('30')
  const visible = data.slice(-Number(period))
  const firstDate = visible[0]?.date
  const lastDate = visible.at(-1)?.date
  const total = visible.reduce((sum, point) => sum + point.revenue, 0)
  const previous = visible.reduce((sum, point) => sum + point.previousRevenue, 0)
  const change = previous > 0 ? ((total - previous) / previous) * 100 : 0
  return (
    <Card className="h-full shadow-xs">
      <CardHeader className="gap-1">
        <CardTitle>Revenue overview</CardTitle>
        <CardDescription>How your business is performing over time.</CardDescription>
        <CardAction>
          <Select value={period} onValueChange={setPeriod}>
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
        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(total)}
          </span>
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="size-3" />
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}%
          </Badge>
        </div>
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
                <stop offset="95%" stopColor="var(--color-previousRevenue)" stopOpacity={0.02} />
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
                  labelFormatter={(value) => formatDate(String(value))}
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
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        {firstDate ? formatDate(firstDate) : 'No data'} –{' '}
        {lastDate ? formatDate(lastDate) : 'No data'} · Revenue in USD
      </CardFooter>
    </Card>
  )
}
