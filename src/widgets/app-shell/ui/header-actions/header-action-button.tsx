import type { ComponentProps, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Kbd } from '@/shared/ui/kbd'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'

type FixedAppearanceProp = 'variant' | 'size' | 'className' | 'style'
type HeaderAccountProfile = Pick<
  ComponentProps<typeof ProfileAvatar>,
  'name' | 'src' | 'pending'
> & {
  nickname?: string
}
type HeaderActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  FixedAppearanceProp | 'children' | 'asChild' | 'aria-label'
> &
  Partial<Record<FixedAppearanceProp, never>> & { 'aria-label': string } & (
    | { children: ReactNode; asChild?: boolean; desktopSearchLabel?: never; accountProfile?: never }
    | { desktopSearchLabel: string; children?: never; asChild?: never; accountProfile?: never }
    | {
        accountProfile: HeaderAccountProfile
        children?: never
        asChild?: never
        desktopSearchLabel?: never
      }
  )

/** Radix triggers pass their events and ref through to the real button or slotted link. */
export function HeaderActionButton({
  children,
  desktopSearchLabel,
  accountProfile,
  asChild,
  ...props
}: HeaderActionButtonProps) {
  const search = desktopSearchLabel !== undefined
  let content = children
  if (search) {
    content = (
      <>
        <Search aria-hidden="true" />
        <span className="hidden xl:inline">{desktopSearchLabel}</span>
        <Kbd aria-hidden="true" className="hidden xl:inline-flex">
          ⌘ K
        </Kbd>
      </>
    )
  } else if (accountProfile) {
    const { name, nickname, src, pending } = accountProfile
    const displayName = nickname ?? name
    content = (
      <>
        <ProfileAvatar name={name} src={src} pending={pending} size="sm" />
        {pending ? (
          <Skeleton as="span" aria-hidden="true" className="hidden h-3 w-14 xl:block" />
        ) : displayName ? (
          <span data-slot="account-nickname" className="hidden max-w-[12ch] truncate xl:block">
            {displayName}
          </span>
        ) : null}
      </>
    )
  }
  return (
    <Button
      {...props}
      asChild={asChild}
      variant="ghost"
      size="icon-sm"
      className={cn(
        '[&_svg]:size-4',
        search && 'xl:h-9 xl:w-auto xl:px-3 xl:text-muted-foreground',
        accountProfile && 'xl:w-auto xl:px-2',
      )}
      data-header-search={search ? 'true' : undefined}
      data-header-account={accountProfile ? 'true' : undefined}
      aria-keyshortcuts={search ? 'Meta+K Control+K' : props['aria-keyshortcuts']}
    >
      {content}
    </Button>
  )
}
