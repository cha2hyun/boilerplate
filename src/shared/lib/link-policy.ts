export type LinkTarget = '_self' | '_blank'

interface LinkPolicyOptions {
  baseUrl: string
  target?: LinkTarget
  rel?: string
}

interface LinkPolicy {
  href: string | undefined
  target: LinkTarget | undefined
  rel: string | undefined
  opensNewTab: boolean
}

/** Web navigation only. External origins always open a separate browsing context. */
export function resolveLinkPolicy(
  href: string | undefined,
  { baseUrl, target = '_self', rel }: LinkPolicyOptions,
): LinkPolicy {
  const unavailable: LinkPolicy = {
    href: undefined,
    target: undefined,
    rel: undefined,
    opensNewTab: false,
  }
  if (!href?.trim()) return unavailable

  try {
    const base = new URL(baseUrl)
    const destination = new URL(href.trim(), base)
    if (
      !['http:', 'https:'].includes(destination.protocol) ||
      destination.username ||
      destination.password
    ) {
      return unavailable
    }

    const opensNewTab = destination.origin !== base.origin || target === '_blank'
    const relTokens = new Set(
      rel
        ?.split(/\s+/)
        .filter(Boolean)
        .map((token) => token.toLowerCase()),
    )
    if (opensNewTab) {
      relTokens.delete('opener')
      relTokens.add('noopener')
      relTokens.add('noreferrer')
    }

    return {
      href: destination.href,
      target: opensNewTab ? '_blank' : '_self',
      rel: relTokens.size ? [...relTokens].join(' ') : undefined,
      opensNewTab,
    }
  } catch {
    return unavailable
  }
}
