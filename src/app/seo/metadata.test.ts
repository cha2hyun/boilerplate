import { afterEach, describe, expect, it } from 'vitest'
import { createPageHead, parseSiteUrl } from './metadata'
import { updateDocumentHead } from './head-dom'

afterEach(() => {
  document.head.innerHTML = ''
})

describe('page metadata', () => {
  it('keeps every admin route unindexed even when a public origin is configured', () => {
    for (const path of [
      '/',
      '/projects',
      '/login',
      '/users',
      '/account',
      '/analytics',
      '/orders',
      '/customers',
      '/inbox',
      '/settings',
      '/components',
      '/foundations',
    ]) {
      const tags = createPageHead(path, 'https://blueprint.example')
      expect(tags.find(({ attributes }) => attributes.name === 'robots')?.attributes.content).toBe(
        'noindex, nofollow',
      )
      expect(tags.find(({ attributes }) => attributes.rel === 'canonical')?.attributes.href).toBe(
        `https://blueprint.example${path}`,
      )
    }
  })

  it('indexes only explicitly public routes and still respects development and unknown-route restrictions', () => {
    const options = { indexablePaths: ['/foundations'] as const }
    const robots = (path: string, origin?: string, indexable = true) =>
      createPageHead(path, origin, { ...options, indexable }).find(
        ({ attributes }) => attributes.name === 'robots',
      )?.attributes.content
    expect(robots('/Foundations/?preview=1', 'https://blueprint.example')).toBe('index, follow')
    expect(robots('/orders', 'https://blueprint.example')).toBe('noindex, nofollow')
    expect(robots('/missing', 'https://blueprint.example')).toBe('noindex, nofollow')
    expect(robots('/foundations')).toBe('noindex, nofollow')
    expect(robots('/foundations', 'http://127.0.0.1:5173', false)).toBe('noindex, nofollow')
  })

  it('switches client metadata language without changing canonical URLs or accumulating tags', () => {
    const origin = 'https://blueprint.example'
    updateDocumentHead(createPageHead('/orders', origin, { locale: 'ko-KR' }))
    expect(document.title).toBe('주문 · Blueprint')
    expect(document.head.querySelector('[property="og:locale"]')).toHaveAttribute(
      'content',
      'ko_KR',
    )
    expect(document.head.querySelector('[rel="canonical"]')).toHaveAttribute(
      'href',
      `${origin}/orders`,
    )
    updateDocumentHead(createPageHead('/orders', origin, { locale: 'en-US' }))
    expect(document.title).toBe('Orders · Blueprint')
    expect(document.head.querySelectorAll('[property="og:locale"]')).toHaveLength(1)
    expect(document.head.querySelector('[property="og:locale"]')).toHaveAttribute(
      'content',
      'en_US',
    )
  })

  it('omits absolute URLs before a public origin is configured', () => {
    const tags = createPageHead('/orders')
    expect(
      tags.some(
        ({ attributes }) =>
          attributes.rel === 'canonical' ||
          attributes.property === 'og:url' ||
          attributes.property === 'og:image',
      ),
    ).toBe(false)
    expect(tags.find(({ attributes }) => attributes.name === 'robots')?.attributes.content).toBe(
      'noindex, nofollow',
    )
  })

  it('uses the configured origin and removes search/hash/trailing slash from canonical URLs', () => {
    const tags = createPageHead('/OrDeRs/?customer=private#details', ' https://blueprint.example/ ')
    expect(tags.find(({ attributes }) => attributes.rel === 'canonical')?.attributes.href).toBe(
      'https://blueprint.example/orders',
    )
    expect(
      tags.find(({ attributes }) => attributes.property === 'og:image')?.attributes.content,
    ).toBe('https://blueprint.example/og/blueprint.png')
    expect(
      tags.find(({ attributes }) => attributes.property === 'og:title')?.attributes.content,
    ).toBe('Orders · Blueprint')
  })

  it('supports a local development origin while keeping the page unindexed', () => {
    const tags = createPageHead('/orders', 'http://127.0.0.1:5173', { indexable: false })
    expect(
      tags.find(({ attributes }) => attributes.property === 'og:image')?.attributes.content,
    ).toBe('http://127.0.0.1:5173/og/blueprint.png')
    expect(tags.find(({ attributes }) => attributes.name === 'robots')?.attributes.content).toBe(
      'noindex, nofollow',
    )
  })

  it.each([
    '//example.com',
    'javascript:alert(1)',
    'https://user:secret@example.com',
    'https://example.com/private',
    'https://example.com/a/..',
    'https://example.com?token=secret',
    'https://example.com#hash',
    'https://example.com\\path',
  ])('rejects an invalid deployment origin %s', (input) => {
    expect(() => parseSiteUrl(input)).toThrow('VITE_SITE_URL')
  })

  it('replaces static tags across navigation, keeps icons, and clears stale canonical data on 404', () => {
    document.head.innerHTML =
      '<link rel="icon" href="/favicon.svg"><title data-page-meta>Initial title</title>'
    updateDocumentHead(createPageHead('/projects', 'https://blueprint.example'))
    updateDocumentHead(createPageHead('/orders', 'https://blueprint.example'))
    expect(document.title).toBe('Orders · Blueprint')
    expect(document.head.querySelectorAll('title')).toHaveLength(1)
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://blueprint.example/orders',
    )
    expect(document.head.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
    updateDocumentHead(createPageHead('/missing', 'https://blueprint.example'))
    expect(document.title).toBe('Page not found · Blueprint')
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    expect(
      document.head.querySelector(
        'link[rel="canonical"], meta[property="og:url"], meta[property="og:image"]',
      ),
    ).toBeNull()
  })
})
