import { defaultParseSearch } from '@tanstack/react-router'
import { z } from 'zod'
import { usersSearchSchema } from '@/pages/users/search'

export const loginSearchSchema = z.object({
  returnTo: z.string().max(2048).optional().catch(undefined),
})

// Rebuild a typed internal destination. Never navigate to a URL supplied by the login form.
export function demoDestination(returnTo?: string) {
  if (returnTo && /^\/users\/?(?:\?|$)/i.test(returnTo)) {
    const target = new URL(returnTo, 'https://blueprint.invalid')
    return {
      to: '/users' as const,
      search: usersSearchSchema.parse(defaultParseSearch(target.search)),
    }
  }
  return { to: '/account' as const }
}
