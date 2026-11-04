import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/shared/lib/utils'

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
} as const

export type StackProps = Omit<ComponentProps<'div'>, 'style' | 'dangerouslySetInnerHTML'> & {
  asChild?: boolean
  align?: keyof typeof alignClasses
  justify?: keyof typeof justifyClasses
  wrap?: boolean
}

function Stack({
  direction,
  asChild = false,
  align = 'center',
  justify = 'start',
  wrap = false,
  className,
  ...props
}: StackProps & { direction: 'row' | 'column' }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      {...(!asChild && { 'data-slot': direction === 'row' ? 'h-stack' : 'v-stack' })}
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    />
  )
}

/** Horizontal groups align their children's vertical centers by default. */
export function HStack(props: StackProps) {
  return <Stack {...props} direction="row" />
}

/** Use align="stretch" for full-width page/form columns. */
export function VStack(props: StackProps) {
  return <Stack {...props} direction="column" />
}
