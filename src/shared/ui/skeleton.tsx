import { createElement, type ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

type SkeletonProps =
  (ComponentProps<'div'> & { as?: 'div' }) | (ComponentProps<'span'> & { as: 'span' })

function Skeleton({ as = 'div', className, ...props }: SkeletonProps) {
  return createElement(as, {
    'data-slot': 'skeleton',
    className: cn('animate-pulse rounded-md bg-accent motion-reduce:animate-none', className),
    ...props,
  })
}

export { Skeleton }
