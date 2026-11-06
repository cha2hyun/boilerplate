import type { ComponentProps, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Kbd } from '@/shared/ui/kbd'
import { cn } from '@/shared/lib/utils'

type FixedAppearanceProp = 'variant' | 'size' | 'className' | 'style'

type HeaderActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  FixedAppearanceProp | 'children' | 'asChild' | 'aria-label'
> &
  Partial<Record<FixedAppearanceProp, never>> & { 'aria-label': string } & (
    | { children: ReactNode; asChild?: boolean; desktopSearchLabel?: never }
    | { desktopSearchLabel: string; children?: never; asChild?: never }
  )

/** Radix triggers pass their events and ref through to the real button or slotted link. */
export function HeaderActionButton({
  children,
  desktopSearchLabel,
  asChild,
  ...props
}: HeaderActionButtonProps) {
  const search = desktopSearchLabel !== undefined
  return (
    <Button
      {...props}
      asChild={asChild}
      variant="ghost"
      size="icon-sm"
      className={cn(
        '[&_svg]:size-4',
        search && 'xl:h-9 xl:w-auto xl:px-3 xl:text-muted-foreground',
      )}
      data-header-search={search ? 'true' : undefined}
      aria-keyshortcuts={search ? 'Meta+K Control+K' : props['aria-keyshortcuts']}
    >
      {search ? (
        <>
          <Search aria-hidden="true" />
          <span className="hidden xl:inline">{desktopSearchLabel}</span>
          <Kbd aria-hidden="true" className="hidden xl:inline-flex">
            ⌘ K
          </Kbd>
        </>
      ) : (
        children
      )}
    </Button>
  )
}
