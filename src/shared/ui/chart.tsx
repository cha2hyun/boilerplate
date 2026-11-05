'use client'

import * as React from 'react'
import { useFormatters } from '@/shared/lib/i18n/use-formatters'
import { cn } from '@/shared/lib/utils'
import * as RechartsPrimitive from 'recharts'
import type { TooltipValueType } from 'recharts'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

const INITIAL_DIMENSION = { width: 320, height: 200 } as const
type TooltipNameType = number | string

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

interface ChartContextProps {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
  initialDimension?: {
    width: number
    height: number
  }
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme ?? config.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltipLayoutContext = React.createContext<{
  chartWidth: number | undefined
  contentWidth: number
  needsFullWidth: boolean
  setContentWidth: (width: number) => void
} | null>(null)

function ChartTooltip({
  position,
  ...props
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip>) {
  const chartWidth = RechartsPrimitive.useChartWidth()
  const plotArea = RechartsPrimitive.usePlotArea()
  const [contentWidth, setContentWidth] = React.useState(0)
  const needsFullWidth = plotArea != null && contentWidth > plotArea.width
  const layout = React.useMemo(
    () => ({ chartWidth, contentWidth, needsFullWidth, setContentWidth }),
    [chartWidth, contentWidth, needsFullWidth],
  )

  return (
    <ChartTooltipLayoutContext.Provider value={layout}>
      <RechartsPrimitive.Tooltip
        {...props}
        position={needsFullWidth && position?.x == null ? { ...position, x: 0 } : position}
      />
    </ChartTooltipLayoutContext.Provider>
  )
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  valueFormatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
    valueFormatter?: (value: number) => string
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>,
    'accessibilityLayer'
  >) {
  const { config } = useChart()
  const { formatNumber } = useFormatters()
  const layout = React.useContext(ChartTooltipLayoutContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const element = contentRef.current
    if (!layout) {
      return
    }
    if (!element) {
      layout.setContentWidth(0)
      return
    }
    const measure = () => {
      layout.setContentWidth(element.getBoundingClientRect().width)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [active, payload?.length, layout])

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = getPayloadKey(labelKey ?? item?.dataKey ?? item?.name)
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>
      )
    }

    if (!value) {
      return null
    }

    return <div className={cn('font-medium', labelClassName)}>{value}</div>
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== 'dot'

  return (
    <div
      ref={contentRef}
      data-slot="chart-tooltip-content"
      style={
        layout?.chartWidth
          ? ({
              '--chart-tooltip-width': `${String(layout.chartWidth)}px`,
              // Keep the measured width when stacking values so the layout cannot
              // shrink below the plot threshold and oscillate between modes.
              '--chart-tooltip-min-width': layout.needsFullWidth
                ? `${String(Math.min(layout.contentWidth, layout.chartWidth))}px`
                : undefined,
            } as React.CSSProperties)
          : undefined
      }
      className={cn(
        'grid max-w-(--chart-tooltip-width) min-w-[min(var(--chart-tooltip-min-width,8rem),var(--chart-tooltip-width,8rem))] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== 'none')
          .map((item, index) => {
            const key = getPayloadKey(nameKey ?? item.name ?? item.dataKey)
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color ?? getPayloadFill(item.payload) ?? item.color

            return (
              <div
                key={index}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                  indicator === 'dot' && 'items-center',
                  layout?.needsFullWidth && !formatter && 'grid grid-cols-[auto_minmax(0,1fr)]',
                )}
              >
                {formatter && item.value !== undefined && item.name !== undefined ? (
                  formatter(item.value, item.name, item, index, payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                            {
                              'h-2.5 w-2.5': indicator === 'dot',
                              'w-1': indicator === 'line',
                              'w-0 border-[1.5px] border-dashed bg-transparent':
                                indicator === 'dashed',
                              'my-0.5': nestLabel && indicator === 'dashed',
                            },
                          )}
                          style={
                            {
                              '--color-bg': indicatorColor,
                              '--color-border': indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 flex-wrap justify-between gap-x-3 gap-y-1.5 leading-none',
                        nestLabel ? 'items-end' : 'items-center',
                        layout?.needsFullWidth && 'contents',
                      )}
                    >
                      <div className="grid min-w-0 gap-1.5 wrap-anywhere">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label ?? item.name}
                        </span>
                      </div>
                      {item.value != null && (
                        <span
                          data-slot="chart-tooltip-value"
                          className={cn(
                            'min-w-0 font-mono font-medium wrap-anywhere text-foreground tabular-nums',
                            layout?.needsFullWidth && 'col-span-full',
                          )}
                        >
                          {formatTooltipValue(item.value, valueFormatter ?? formatNumber)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  position = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> & {
  hideIcon?: boolean
  nameKey?: string
  position?: React.ComponentProps<typeof RechartsPrimitive.Legend>['position']
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-2',
        position === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== 'none')
        .map((item, index) => {
          const key = getPayloadKey(nameKey ?? item.dataKey)
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground',
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}

function formatTooltipValue(value: TooltipValueType, format: (value: number) => string): string {
  if (typeof value === 'number') return format(value)
  if (typeof value === 'string') return value
  return value.map((item) => (typeof item === 'number' ? format(item) : item)).join(', ')
}

function getPayloadKey(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : 'value'
}

function getPayloadFill(payload: unknown) {
  return typeof payload === 'object' &&
    payload !== null &&
    'fill' in payload &&
    typeof payload.fill === 'string'
    ? payload.fill
    : undefined
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined
  }

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload]
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload]
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
