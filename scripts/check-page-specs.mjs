import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inlineLinks, proseOnly } from './markdown-links.mjs'

export const requiredSections = [
  '목적과 범위',
  '정보 구조와 주요 행동',
  '조회·조작 계약',
  '상태별 화면',
  '반응형 동작',
  '상태 소유권과 구현 근거',
  '수용 기준',
]

function sectionBody(prose, heading) {
  const start = prose.indexOf(`## ${heading}\n`)
  if (start < 0) return ''
  const body = prose.slice(start + heading.length + 4)
  const end = body.search(/^## /m)
  return end < 0 ? body : body.slice(0, end)
}

async function fileInfo(file) {
  try {
    return await stat(file)
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined
    throw error
  }
}

function canonicalRoute(route) {
  if (route === '/') return route
  const normalized = route?.replace(/\/$/, '')
  return /^\/(?:[a-z0-9-]+|\$[A-Za-z_]\w*)(?:\/(?:[a-z0-9-]+|\$[A-Za-z_]\w*))*$/.test(
    normalized ?? '',
  )
    ? normalized
    : undefined
}

export async function checkPageSpecs(root = process.cwd()) {
  root = path.resolve(root)
  const issues = []
  const routeDirectory = path.join(root, 'src/app/routes')
  const pageDirectory = path.join(root, 'docs/pages')
  const routeEntries = await readdir(routeDirectory, { recursive: true, withFileTypes: true })
  const routes = new Map()
  for (const entry of routeEntries.filter(
    (item) =>
      item.isFile() &&
      /\.[jt]sx?$/.test(item.name) &&
      !/^(?:__root\.|-)|\.(test|spec)\./.test(item.name),
  )) {
    const file = path.join(entry.parentPath, entry.name)
    const source = await readFile(file, 'utf8')
    const declarations = [
      ...source.matchAll(/export\s+const\s+Route\s*=\s*createFileRoute\(\s*(['"])([^'"]+)\1\s*\)/g),
    ]
    const route = canonicalRoute(declarations[0]?.[2])
    if (declarations.length !== 1 || !route) {
      issues.push(
        `${path.relative(root, file)}: expected one static createFileRoute path; update the checker for a new route convention.`,
      )
      continue
    }
    if (routes.has(route)) issues.push(`${path.relative(root, file)}: duplicate route ${route}.`)
    routes.set(route, file)
  }
  if (routes.size === 0) issues.push('src/app/routes: no page routes discovered.')
  if (!(await fileInfo(pageDirectory))?.isDirectory())
    return [...issues, 'docs/pages: missing page specification directory.']

  const entries = await readdir(pageDirectory, { withFileTypes: true })
  const documents = new Map()
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.md'))) {
    documents.set(
      entry.name,
      proseOnly(await readFile(path.join(pageDirectory, entry.name), 'utf8')),
    )
  }
  for (const name of ['README.md', '_template.md']) {
    if (!documents.has(name)) issues.push(`docs/pages/${name}: missing authoring entry point.`)
  }

  const assigned = new Map()
  for (const [name, prose] of documents) {
    const file = `docs/pages/${name}`
    const localLinks = []
    for (const { target, index } of inlineLinks(prose, file, issues)) {
      const unescaped = target.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1')
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(unescaped)) continue
      let decoded
      try {
        decoded = decodeURIComponent(unescaped.split(/[?#]/, 1)[0])
      } catch {
        issues.push(`${file}: invalid URL encoding in link ${target}.`)
        continue
      }
      const resolved = path.resolve(pageDirectory, decoded)
      const relative = path.relative(root, resolved)
      if (
        !decoded ||
        path.isAbsolute(decoded) ||
        relative === '..' ||
        relative.startsWith(`..${path.sep}`)
      ) {
        issues.push(`${file}: local link must stay inside the repository: ${target}.`)
      } else {
        const info = await fileInfo(resolved)
        if (!info) issues.push(`${file}: missing local link target ${target}.`)
        else
          localLinks.push({
            relative: relative.split(path.sep).join('/'),
            index,
            isFile: info.isFile(),
          })
      }
    }
    if (name === 'README.md' || name === '_template.md') continue
    const markers = [...prose.matchAll(/^<!-- page-route: (\S+) -->$/gm)]
    if (markers.length !== 1) {
      issues.push(`${file}: expected exactly one <!-- page-route: /path --> declaration.`)
    } else {
      const declaredRoute = markers[0][1]
      const route = canonicalRoute(declaredRoute) ?? declaredRoute
      if (route !== declaredRoute)
        issues.push(`${file}: use canonical page-route ${route} without an index trailing slash.`)
      const expectedName = `${route === '/' ? 'overview' : route.slice(1).replaceAll('/', '-')}.md`
      if (!routes.has(route)) issues.push(`${file}: unknown route ${route}.`)
      if (name !== expectedName)
        issues.push(`${file}: canonical filename for ${route} is ${expectedName}.`)
      if (assigned.has(route)) issues.push(`${file}: duplicate specification for ${route}.`)
      assigned.set(route, name)
    }
    for (const heading of requiredSections) {
      if (!sectionBody(prose, heading).trim())
        issues.push(`${file}: missing or empty section "${heading}".`)
    }
    const ownership = sectionBody(prose, '상태 소유권과 구현 근거')
    const acceptance = sectionBody(prose, '수용 기준')
    const linksInSection = (body) =>
      localLinks.filter(
        ({ index }) =>
          body && index >= prose.indexOf(body) && index < prose.indexOf(body) + body.length,
      )
    if (
      !linksInSection(ownership).some(
        ({ relative, isFile }) => isFile && relative.startsWith('src/'),
      )
    ) {
      issues.push(`${file}: ownership section needs an existing source file link.`)
    }
    if (
      !linksInSection(acceptance).some(
        ({ relative, isFile }) => isFile && /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relative),
      )
    ) {
      issues.push(`${file}: acceptance section needs an existing test file link.`)
    }
  }
  for (const route of routes.keys()) {
    if (!assigned.has(route)) issues.push(`${route}: missing page specification in docs/pages.`)
  }
  return issues.sort()
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = await checkPageSpecs()
  if (issues.length) {
    for (const issue of issues) console.error(issue)
    process.exitCode = 1
  } else {
    console.log(
      'Page specs passed: route coverage, required sections, and local file links. Behavioral meaning is not checked.',
    )
  }
}
