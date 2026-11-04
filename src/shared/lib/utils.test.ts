import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('shared class composition', () => {
  it('accepts nested conditions and the object maps used by chart indicators', () => {
    expect(
      cn('flex', [undefined, ['gap-2', null, false]], {
        'items-center': true,
        hidden: false,
      }),
    ).toBe('flex gap-2 items-center')
  })

  it('allows shadcn consumer padding overrides without dropping unaffected axes', () => {
    expect(cn('p-4', 'px-2')).toBe('p-4 px-2')
    expect(cn('p-4 px-2', 'p-6')).toBe('p-6')
  })

  it('distinguishes semantic text colors, font sizes and font weights', () => {
    expect(
      cn('text-sm font-normal text-muted-foreground', 'text-lg font-medium text-foreground'),
    ).toBe('text-lg font-medium text-foreground')
  })

  it('keeps stack alignment and breakpoint scopes independent', () => {
    expect(cn('flex items-center gap-3 md:gap-4', 'md:flex-row md:items-start md:gap-6')).toBe(
      'flex items-center gap-3 md:flex-row md:items-start md:gap-6',
    )
  })

  it('resolves important sidebar classes only within their matching state', () => {
    expect(
      cn(
        'size-10 group-data-[collapsible=icon]:size-8! hover:bg-accent',
        'group-data-[collapsible=icon]:size-9! hover:bg-muted',
      ),
    ).toBe('size-10 group-data-[collapsible=icon]:size-9! hover:bg-muted')
  })

  it('preserves custom properties and non-Tailwind names while replacing arbitrary widths', () => {
    expect(cn('recharts-wrapper min-w-190 [--sidebar-width:16rem]', 'min-w-[1840px]')).toBe(
      'recharts-wrapper [--sidebar-width:16rem] min-w-[1840px]',
    )
  })
})
