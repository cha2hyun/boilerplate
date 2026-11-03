import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { routeMetadataPlugin, renderHead, withPageHead } from './route-metadata.ts'

const sourceHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('escapes metadata content instead of allowing HTML injection', () => {
  const attack = '</title><script>alert("x")</script>&'
  const html = renderHead([
    { tag: 'title', attributes: {}, text: attack },
    { tag: 'meta', attributes: { name: 'description', content: attack } },
  ])
  assert.equal(html.includes('<script>'), false)
  assert.ok(html.includes('&lt;/title&gt;'))
  assert.ok(html.includes('&quot;x&quot;'))
  assert.ok(html.includes('&amp;'))
})

test('emits route-specific HTML from the built shell without changing scripts or app markup', () => {
  const plugin = routeMetadataPlugin()
  plugin.configResolved({ base: '/', env: { VITE_SITE_URL: 'https://blueprint.example' } })
  const built = sourceHtml.replace('/src/main.tsx', '/assets/app-hashed.js')
  const index = plugin.transformIndexHtml.handler(built, {})
  const emitted = []
  plugin.generateBundle.call(
    { emitFile: (asset) => emitted.push(asset) },
    {},
    {
      'index.html': { type: 'asset', source: index },
    },
  )
  assert.deepEqual(emitted.map(({ fileName }) => fileName).sort(), [
    '404.html',
    'analytics/index.html',
    'components/index.html',
    'customers/index.html',
    'foundations/index.html',
    'inbox/index.html',
    'orders/index.html',
    'projects/index.html',
    'settings/index.html',
  ])
  for (const asset of emitted) {
    assert.equal(asset.source.split('<body>')[1], index.split('<body>')[1])
    assert.ok(asset.source.includes('/assets/app-hashed.js'))
  }
  const orders = emitted.find(({ fileName }) => fileName === 'orders/index.html')
  assert.ok(orders)
  assert.ok(orders.source.includes('<title data-page-meta>Orders · Blueprint</title>'))
  assert.ok(orders.source.includes('property="og:url" content="https://blueprint.example/orders"'))
  const foundations = emitted.find(({ fileName }) => fileName === 'foundations/index.html')
  assert.ok(foundations)
  assert.ok(foundations.source.includes('<title data-page-meta>Foundations · Blueprint</title>'))
  assert.ok(
    foundations.source.includes(
      'property="og:url" content="https://blueprint.example/foundations"',
    ),
  )
  const missing = emitted.find(({ fileName }) => fileName === '404.html')
  assert.ok(missing.source.includes('content="noindex, nofollow"'))
  assert.equal(missing.source.includes('rel="canonical"'), false)
})

test('uses the requested route in development and requires explicit HTML markers', () => {
  const plugin = routeMetadataPlugin()
  plugin.configResolved({ base: '/', env: {} })
  const html = plugin.transformIndexHtml.handler(sourceHtml, {
    server: {},
    originalUrl: '/customers?tab=active',
  })
  assert.ok(html.includes('<title data-page-meta>Customers · Blueprint</title>'))
  assert.equal(html.includes('property="og:image"'), false)
  plugin.configResolved({ base: '/', env: { VITE_SITE_URL: 'https://blueprint.example' } })
  const configuredDevHtml = plugin.transformIndexHtml.handler(sourceHtml, {
    server: {},
    originalUrl: '/customers',
  })
  assert.ok(configuredDevHtml.includes('content="noindex, nofollow"'))
  assert.throws(() => withPageHead('<html><head></head></html>', '/'), /metadata head markers/)
})

test('serves known preview routes from their directory HTML before SPA fallback', () => {
  const plugin = routeMetadataPlugin()
  let middleware
  plugin.configurePreviewServer({
    middlewares: {
      use: (handler) => {
        middleware = handler
      },
    },
  })
  assert.equal(typeof middleware, 'function')
  for (const [method, url, expected] of [
    ['GET', '/projects', '/projects/index.html'],
    ['GET', '/orders/?status=all', '/orders/index.html?status=all'],
    ['HEAD', '/Orders?status=all', '/orders/index.html?status=all'],
    ['GET', '/', '/'],
    ['GET', '/missing', '/missing'],
    ['GET', '/assets/app.js', '/assets/app.js'],
    ['POST', '/projects', '/projects'],
  ]) {
    const request = { method, url }
    let nextCalls = 0
    middleware(request, {}, () => {
      nextCalls += 1
    })
    assert.equal(request.url, expected)
    assert.equal(nextCalls, 1)
  }
})
