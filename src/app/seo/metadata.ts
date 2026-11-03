export interface PageMetadata {
  title: string
  description: string
  image?: `/${string}`
  imageAlt?: string
}

/** Shared by the client head and the static HTML build; never include private user data. */
export const pageMetadata = {
  '/': {
    title: 'Overview',
    description:
      'A clear view of your workspace, with sample metrics, recent activity, and projects in Blueprint.',
  },
  '/projects': {
    title: 'Projects',
    description:
      'Organize projects, track progress, and explore a complete project workflow in the Blueprint demo workspace.',
  },
  '/analytics': {
    title: 'Analytics',
    description:
      'Explore sample visitor trends, traffic sources, and page performance in Blueprint Analytics.',
  },
  '/orders': {
    title: 'Orders',
    description:
      'Browse sample orders, filter fulfillment status, and inspect order details in Blueprint.',
  },
  '/customers': {
    title: 'Customers',
    description:
      'Explore sample customer profiles, purchase history, and customer activity in Blueprint.',
  },
  '/inbox': {
    title: 'Inbox',
    description:
      'Explore sample conversations, organize messages, and try the Blueprint inbox workflow.',
  },
  '/components': {
    title: 'Components',
    description:
      'Explore Blueprint’s accessible UI components, semantic theme tokens, and Pretendard typography.',
  },
  '/settings': {
    title: 'Settings',
    description:
      'Personalize the Blueprint demo workspace with theme, layout, and workspace preferences.',
  },
  '/foundations': {
    title: 'Foundations',
    description:
      'Explore Blueprint’s design foundations, layout recipes, writing principles, and accessible feedback.',
  },
} as const satisfies Record<string, PageMetadata>

export type PagePath = keyof typeof pageMetadata
export const pagePaths = Object.keys(pageMetadata) as PagePath[]

export interface HeadTag {
  tag: 'title' | 'meta' | 'link'
  attributes: Record<string, string>
  text?: string
}

/** The application is hosted at an origin root; a public URL is optional before deployment. */
export function parseSiteUrl(input: unknown): string | undefined {
  if (input === undefined || input === '') return undefined
  if (typeof input === 'string') {
    const value = input.trim()
    if (!value) return undefined
    if (/^https?:\/\/[^/?#\\\s]+\/?$/i.test(value)) {
      try {
        const url = new URL(value)
        if (!url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) {
          return url.origin
        }
      } catch {
        // Give the same actionable configuration error for every invalid origin.
      }
    }
  }
  throw new Error(
    'VITE_SITE_URL must be an HTTP(S) origin without credentials, path, query, or hash.',
  )
}

export function normalizePagePath(pathname: string): string {
  const [path = ''] = pathname.split(/[?#]/, 1)
  const normalized = path.replace(/\/+$/, '')
  return normalized.length === 0 ? '/' : normalized
}

export function createPageHead(
  pathname: string,
  siteUrl?: string,
  { indexable = true }: { indexable?: boolean } = {},
): HeadTag[] {
  const origin = parseSiteUrl(siteUrl)
  const requestedPath = normalizePagePath(pathname)
  const path = pagePaths.find((route) => route.toLowerCase() === requestedPath.toLowerCase())
  const known = path !== undefined
  const page: PageMetadata = known
    ? pageMetadata[path]
    : { title: 'Page not found', description: 'This page could not be found in Blueprint.' }
  const title = `${page.title} · Blueprint`
  const tags: HeadTag[] = [
    { tag: 'title', attributes: {}, text: title },
    { tag: 'meta', attributes: { name: 'description', content: page.description } },
    {
      tag: 'meta',
      attributes: {
        name: 'robots',
        content: indexable && known && origin ? 'index, follow' : 'noindex, nofollow',
      },
    },
    { tag: 'meta', attributes: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attributes: { property: 'og:site_name', content: 'Blueprint' } },
    { tag: 'meta', attributes: { property: 'og:locale', content: 'en_US' } },
    { tag: 'meta', attributes: { property: 'og:title', content: title } },
    { tag: 'meta', attributes: { property: 'og:description', content: page.description } },
    {
      tag: 'meta',
      attributes: {
        name: 'twitter:card',
        content: origin && known ? 'summary_large_image' : 'summary',
      },
    },
    { tag: 'meta', attributes: { name: 'twitter:title', content: title } },
    { tag: 'meta', attributes: { name: 'twitter:description', content: page.description } },
  ]
  if (origin && known) {
    const url = new URL(path, `${origin}/`).href
    const image = new URL(page.image ?? '/og/blueprint.png', `${origin}/`).href
    const imageAlt =
      page.imageAlt ?? 'Blueprint workspace — a clear foundation for your next product.'
    tags.push(
      { tag: 'link', attributes: { rel: 'canonical', href: url } },
      { tag: 'meta', attributes: { property: 'og:url', content: url } },
      { tag: 'meta', attributes: { property: 'og:image', content: image } },
      { tag: 'meta', attributes: { property: 'og:image:alt', content: imageAlt } },
      { tag: 'meta', attributes: { name: 'twitter:image', content: image } },
      { tag: 'meta', attributes: { name: 'twitter:image:alt', content: imageAlt } },
    )
  }
  return tags
}
