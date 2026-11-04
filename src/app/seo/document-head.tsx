import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { createPageHead, parseSiteUrl } from './metadata'
import { updateDocumentHead } from './head-dom'
import { useLocalePreferences } from '@/shared/lib/i18n/preferences'

const siteUrl =
  parseSiteUrl(import.meta.env.VITE_SITE_URL) ??
  (import.meta.env.DEV ? window.location.origin : undefined)

export function DocumentHead() {
  const locale = useLocalePreferences((state) => state.locale)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useEffect(() => {
    updateDocumentHead(
      createPageHead(pathname, siteUrl, { indexable: !import.meta.env.DEV, locale }),
    )
  }, [pathname, locale])
  return null
}
