import type { ReactNode } from 'react'
import { Badge } from '@/shared/ui/badge'
import { HStack, VStack } from '@/shared/ui/stack'

interface PageHeaderProps {
  title: string
  description?: string
  badgeLabel?: string
  actions?: ReactNode
}

/** Shared page composition: typography and badge appearance have one owner. */
export function PageHeader({ title, description, badgeLabel, actions }: PageHeaderProps) {
  return (
    <VStack
      asChild
      align="stretch"
      className="min-w-0 gap-4 md:flex-row md:items-center md:justify-between"
    >
      <header data-slot="page-header">
        <VStack align="stretch" className="min-w-0 gap-1.5">
          <HStack wrap className="min-w-0 gap-2.5">
            <h1
              data-slot="page-title"
              className="min-w-0 text-2xl leading-8 font-semibold tracking-tight wrap-break-word"
            >
              {title}
            </h1>
            {badgeLabel && (
              <Badge
                data-slot="page-header-badge"
                variant="outline"
                className="text-muted-foreground"
              >
                {badgeLabel}
              </Badge>
            )}
          </HStack>
          {description && (
            <p
              data-slot="page-description"
              className="max-w-2xl text-sm leading-6 wrap-break-word text-muted-foreground"
            >
              {description}
            </p>
          )}
        </VStack>
        {actions && (
          <HStack wrap className="shrink-0 gap-2">
            {actions}
          </HStack>
        )}
      </header>
    </VStack>
  )
}
