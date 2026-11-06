import { normalizePagePath } from '../../shared/lib/normalize-page-path.ts'
import { product } from '../../shared/config/product.ts'

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
    description: `A clear view of your workspace, with sample metrics, recent activity, and projects in ${product.name}.`,
  },
  '/projects': {
    title: 'Projects',
    description: `Organize projects, track progress, and explore a complete project workflow in the ${product.name} demo workspace.`,
  },
  '/analytics': {
    title: 'Analytics',
    description: `Explore sample visitor trends, traffic sources, and page performance in ${product.name} Analytics.`,
  },
  '/orders': {
    title: 'Orders',
    description: `Browse sample orders, filter fulfillment status, and inspect order details in ${product.name}.`,
  },
  '/customers': {
    title: 'Customers',
    description: `Explore sample customer profiles, purchase history, and customer activity in ${product.name}.`,
  },
  '/inbox': {
    title: 'Inbox',
    description: `Explore sample conversations, organize messages, and try the ${product.name} inbox workflow.`,
  },
  '/components': {
    title: 'Components',
    description: `Explore ${product.name}’s accessible UI components, semantic theme tokens, and Pretendard typography.`,
  },
  '/settings': {
    title: 'Settings',
    description: `Personalize the ${product.name} demo workspace with theme, layout, and workspace preferences.`,
  },
  '/foundations': {
    title: 'Foundations',
    description: `Explore ${product.name}’s design foundations, layout recipes, writing principles, and accessible feedback.`,
  },
} as const satisfies Record<string, PageMetadata>

export type PagePath = keyof typeof pageMetadata
/** Explicitly public routes only. Configuring an origin never opts an admin page into indexing. */
export const publicIndexablePaths: readonly PagePath[] = []

const koreanPageMetadata: Record<PagePath, PageMetadata> = {
  '/': {
    title: '개요',
    description: `${product.name}의 샘플 지표, 최근 활동과 프로젝트를 한눈에 확인하세요.`,
  },
  '/projects': {
    title: '프로젝트',
    description: `${product.name} 데모 워크스페이스에서 프로젝트를 관리하고 진행 상황을 확인하세요.`,
  },
  '/analytics': {
    title: '분석',
    description: '방문자 추이, 유입 경로와 페이지 성과를 샘플 데이터로 살펴보세요.',
  },
  '/orders': {
    title: '주문',
    description: '샘플 주문을 검색하고 처리 상태와 주문 상세 정보를 확인하세요.',
  },
  '/customers': {
    title: '고객',
    description: '샘플 고객의 프로필, 구매 내역과 활동을 살펴보세요.',
  },
  '/inbox': { title: '받은 편지함', description: '샘플 대화를 확인하고 메시지를 정리해 보세요.' },
  '/components': {
    title: '컴포넌트',
    description: '접근성을 갖춘 UI 컴포넌트, 의미 기반 테마 토큰과 Pretendard 글꼴을 확인하세요.',
  },
  '/settings': {
    title: '설정',
    description: `${product.name} 워크스페이스의 테마, 레이아웃과 환경 설정을 변경하세요.`,
  },
  '/foundations': {
    title: '디자인 기준',
    description: `${product.name}의 디자인 기준, 레이아웃, 문구와 접근 가능한 피드백을 살펴보세요.`,
  },
}
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

export function createPageHead(
  pathname: string,
  siteUrl?: string,
  {
    indexable = true,
    indexablePaths = publicIndexablePaths,
    locale = 'en-US',
  }: {
    indexable?: boolean
    indexablePaths?: readonly PagePath[]
    locale?: 'en-US' | 'ko-KR'
  } = {},
): HeadTag[] {
  const origin = parseSiteUrl(siteUrl)
  const requestedPath = normalizePagePath(pathname)
  const path = pagePaths.find((route) => route.toLowerCase() === requestedPath.toLowerCase())
  const known = path !== undefined
  const page: PageMetadata = known
    ? locale === 'ko-KR'
      ? koreanPageMetadata[path]
      : pageMetadata[path]
    : locale === 'ko-KR'
      ? {
          title: '페이지를 찾을 수 없어요',
          description: `${product.name}에서 이 페이지를 찾을 수 없어요.`,
        }
      : { title: 'Page not found', description: `This page could not be found in ${product.name}.` }
  const title = `${page.title} · ${product.name}`
  const tags: HeadTag[] = [
    { tag: 'title', attributes: {}, text: title },
    { tag: 'meta', attributes: { name: 'description', content: page.description } },
    {
      tag: 'meta',
      attributes: {
        name: 'robots',
        content:
          indexable && known && origin && indexablePaths.includes(path)
            ? 'index, follow'
            : 'noindex, nofollow',
      },
    },
    { tag: 'meta', attributes: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attributes: { property: 'og:site_name', content: product.name } },
    { tag: 'meta', attributes: { property: 'og:locale', content: locale.replace('-', '_') } },
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
      page.imageAlt ??
      (locale === 'ko-KR'
        ? `${product.name} 워크스페이스 — 다음 제품을 위한 기반.`
        : `${product.name} workspace — a clear foundation for your next product.`)
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
