import { normalizePagePath } from '../src/shared/lib/normalize-page-path.ts'
import type { Plugin } from 'vite'
import { createPageHead, pagePaths, parseSiteUrl, type HeadTag } from '../src/app/seo/metadata.ts'

const headStart = '<!-- blueprint:head:start -->'
const headEnd = '<!-- blueprint:head:end -->'
const headBlock = /<!-- blueprint:head:start -->[\s\S]*?<!-- blueprint:head:end -->/

function escapeHtml(value: string) {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (character) => replacements[character] ?? character)
}

export function renderHead(tags: HeadTag[]) {
  return tags
    .map(({ tag, attributes, text }) => {
      const attrs = Object.entries(attributes)
        .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
        .join('')
      return tag === 'title'
        ? `<title data-page-meta>${escapeHtml(text ?? '')}</title>`
        : `<${tag} data-page-meta${attrs} />`
    })
    .join('\n    ')
}

export function withPageHead(html: string, pathname: string, siteUrl?: string, indexable = true) {
  if (!headBlock.test(html))
    throw new Error('index.html is missing the Blueprint metadata head markers.')
  return html.replace(
    headBlock,
    () =>
      `${headStart}\n    ${renderHead(createPageHead(pathname, siteUrl, { indexable }))}\n    ${headEnd}`,
  )
}

/** Copies only the HTML shell/head. React is neither rendered nor executed during the build. */
export function routeMetadataPlugin(): Plugin {
  let siteUrl: string | undefined
  return {
    name: 'blueprint-route-metadata',
    enforce: 'post',
    configResolved(config) {
      if (config.base !== '/')
        throw new Error('Blueprint route metadata currently requires Vite base: "/".')
      siteUrl = parseSiteUrl(config.env.VITE_SITE_URL)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        return withPageHead(
          html,
          context.server ? (context.originalUrl ?? '/') : '/',
          siteUrl,
          context.server === undefined,
        )
      },
    },
    configurePreviewServer(server) {
      // Vite's SPA fallback resolves /orders.html, but not /orders/index.html, for /orders.
      server.middlewares.use((request, _response, next) => {
        if (request.method === 'GET' || request.method === 'HEAD') {
          const url = request.url ?? '/'
          const pathname = normalizePagePath(url)
          const route = pagePaths.find((path) => path.toLowerCase() === pathname.toLowerCase())
          if (route && route !== '/') {
            const queryIndex = url.indexOf('?')
            const query = queryIndex === -1 ? '' : url.slice(queryIndex)
            request.url = `${route}/index.html${query}`
          }
        }
        next()
      })
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset' || typeof index.source !== 'string') {
        throw new Error('The Vite HTML entry was not emitted before route metadata generation.')
      }
      for (const route of pagePaths) {
        if (route === '/') continue
        this.emitFile({
          type: 'asset',
          fileName: `${route.slice(1)}/index.html`,
          source: withPageHead(index.source, route, siteUrl),
        })
      }
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: withPageHead(index.source, '/404', siteUrl),
      })
    },
  }
}
