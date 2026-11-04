import { useId, type ComponentProps } from 'react'
import { createLink } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from '@/shared/lib/i18n'
import { resolveLinkPolicy, type LinkTarget } from '@/shared/lib/link-policy'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

export type TextLinkProps = Omit<
  ComponentProps<'a'>,
  'href' | 'target' | 'style' | 'download' | 'dangerouslySetInnerHTML'
> & {
  href: string
  target?: LinkTarget
  disabled?: boolean
}

/** The approved shadcn link composition; navigation stays on a real anchor. */
export function TextLink({
  href,
  target,
  rel,
  disabled = false,
  className,
  children,
  onClick,
  tabIndex,
  'aria-describedby': describedBy,
  ...props
}: TextLinkProps) {
  const { t } = useTranslation('common')
  const descriptionId = useId()
  const policy = resolveLinkPolicy(disabled ? undefined : href, {
    baseUrl: window.location.href,
    target,
    rel,
  })
  const unavailable = !policy.href
  const description =
    [describedBy, policy.opensNewTab ? descriptionId : undefined].filter(Boolean).join(' ') ||
    undefined

  return (
    <>
      <Button
        asChild
        variant="link"
        className={cn(
          'inline h-auto max-w-full rounded-xs p-0 text-[length:inherit] leading-[inherit] font-medium whitespace-normal underline underline-offset-4 has-[>svg]:px-0 aria-disabled:pointer-events-none aria-disabled:opacity-50',
          className,
        )}
      >
        <a
          {...props}
          data-slot="text-link"
          href={policy.href}
          target={policy.target}
          rel={policy.rel}
          aria-describedby={description}
          aria-disabled={unavailable || undefined}
          tabIndex={unavailable ? -1 : tabIndex}
          onClick={(event) => {
            if (unavailable) {
              event.preventDefault()
              return
            }
            onClick?.(event)
          }}
        >
          <span className="wrap-anywhere">{children}</span>
          <ArrowUpRight className="ms-1 inline size-[1em] align-text-bottom" aria-hidden="true" />
        </a>
      </Button>
      {policy.opensNewTab && (
        <span id={descriptionId} className="sr-only">
          {t('linkNewTab')}
        </span>
      )}
    </>
  )
}

export const RouterTextLink = createLink(TextLink)
