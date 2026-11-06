import { useState, type ComponentProps } from 'react'
import { UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Skeleton } from '@/shared/ui/skeleton'

type ImageStatus = Parameters<
  NonNullable<ComponentProps<typeof AvatarImage>['onLoadingStatusChange']>
>[0]

interface ProfileAvatarProps {
  name: string
  src?: string | null
  initials?: string
  pending?: boolean
  className?: string
  fallbackClassName?: string
  size?: ComponentProps<typeof Avatar>['size']
}

function nameInitials(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toUpperCase()
}

/** Decorative next to a visible name or a separately named account control. */
export function ProfileAvatar({ src, pending = false, ...props }: ProfileAvatarProps) {
  const source = src?.trim()
  // A different request starts in its own Avatar context; old image events cannot change it.
  return (
    <ProfileAvatarRequest
      key={pending ? 'pending' : `src:${source ?? ''}`}
      {...props}
      src={source}
      pending={pending}
    />
  )
}

function ProfileAvatarRequest({
  name,
  src,
  initials,
  pending = false,
  className,
  fallbackClassName,
  size,
}: ProfileAvatarProps) {
  const [status, setStatus] = useState<ImageStatus>('idle')
  const hasImage = Boolean(src) && !pending && status !== 'error'
  const loading = pending || (hasImage && status !== 'loaded')
  const state = loading ? 'loading' : hasImage ? 'image' : 'fallback'
  const initialText = initials?.trim() ?? ''
  const label = initialText.length > 0 ? initialText : nameInitials(name)

  return (
    <Avatar
      key={state === 'fallback' ? 'fallback' : 'media'}
      size={size}
      className={className}
      data-profile-state={state}
      aria-hidden="true"
    >
      {hasImage && src && (
        <AvatarImage
          src={src}
          alt=""
          className="object-cover"
          onLoadingStatusChange={setStatus}
          onError={() => {
            setStatus('error')
          }}
        />
      )}
      {loading && <Skeleton as="span" className="size-full rounded-full" />}
      {state === 'fallback' && (
        <AvatarFallback className={fallbackClassName}>
          {label.length > 0 ? label : <UserRound aria-hidden="true" className="size-1/2" />}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
