import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
import { Skeleton } from './skeleton'
import { HStack, VStack } from './stack'

interface MetricCardProps {
  label: string
  icon: LucideIcon
  value: ReactNode
  footer: ReactNode
  loading?: boolean
  footerTestId?: string
}

/** A shared shadcn composition; formatting and query state belong to the caller. */
export function MetricCard({
  label,
  icon: Icon,
  value,
  footer,
  loading = false,
  footerTestId,
}: MetricCardProps) {
  return (
    <Card
      data-metric-card
      className="min-h-34 min-w-0 gap-2 py-4 shadow-xs md:min-h-48 md:gap-3 md:py-5"
      aria-label={label}
      aria-busy={loading}
    >
      <HStack asChild justify="between" className="gap-3 px-4 md:px-5">
        <CardHeader>
          <CardDescription className="min-w-0 text-xs font-medium wrap-anywhere">
            <span data-slot="metric-label">{label}</span>
          </CardDescription>
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
      </HStack>
      <VStack asChild align="stretch" justify="center" className="min-h-9 px-4 md:min-h-18 md:px-5">
        <CardContent>
          <CardTitle className="text-3xl leading-9 font-semibold tracking-tight tabular-nums">
            <div data-slot="metric-value" className="min-w-0 wrap-anywhere">
              {loading ? <Skeleton className="h-8 w-28 max-w-full" /> : value}
            </div>
          </CardTitle>
        </CardContent>
      </VStack>
      <HStack
        asChild
        wrap
        className="mt-auto min-h-8 min-w-0 gap-2 px-4 text-xs wrap-anywhere text-muted-foreground md:px-5"
      >
        <CardFooter data-metric-footer data-testid={footerTestId}>
          {footer}
        </CardFooter>
      </HStack>
    </Card>
  )
}
