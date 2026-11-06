import { spawnSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { changedFiles } from './ci-scope.mjs'
import { inlineLinks, markdownHeadingAnchors, proseOnly } from './markdown-links.mjs'

export async function documentationFiles(root) {
  const roots = (await readdir(root)).filter((file) => file.endsWith('.md'))
  const nested = await readdir(path.join(root, 'docs'), { recursive: true, withFileTypes: true })
  return [
    ...roots,
    ...nested
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name))),
  ].sort()
}

export async function checkDocumentation(root, files) {
  const issues = []
  const documents = new Map()
  async function documentAt(filename) {
    if (!documents.has(filename)) {
      const markdown = await readFile(filename, 'utf8')
      documents.set(filename, {
        prose: proseOnly(markdown),
        anchors: markdownHeadingAnchors(markdown),
      })
    }
    return documents.get(filename)
  }
  for (const file of files) {
    const filename = path.resolve(root, file)
    const { prose } = await documentAt(filename)
    const targets = inlineLinks(prose, file, issues).map(({ target }) => target)
    // README previews use HTML picture/img tags as well as Markdown images.
    for (const match of prose.matchAll(
      /<(?:img|source|a)\b[^>]*\b(?:src|srcset|href)="([^"]+)"/g,
    )) {
      targets.push(...match[1].split(',').map((item) => item.trim().split(/\s+/)[0]))
    }
    for (const target of targets) {
      const unescaped = target.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1')
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(unescaped)) continue
      const hash = unescaped.indexOf('#')
      const resource = hash < 0 ? unescaped : unescaped.slice(0, hash)
      let pathname
      let heading
      try {
        pathname = decodeURIComponent(resource.split('?', 1)[0])
        heading = hash < 0 ? '' : decodeURIComponent(unescaped.slice(hash + 1))
      } catch {
        issues.push(`${file}: invalid URL encoding in link ${target}.`)
        continue
      }
      const resolved = pathname ? path.resolve(path.dirname(filename), pathname) : filename
      const relative = path.relative(root, resolved)
      if (path.isAbsolute(pathname) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
        issues.push(`${file}: local link must stay inside the repository: ${target}.`)
        continue
      }
      try {
        const info = await stat(resolved)
        if (
          heading &&
          info.isFile() &&
          /\.md$/i.test(resolved) &&
          !(await documentAt(resolved)).anchors.has(heading)
        )
          issues.push(`${file}: missing Markdown heading in link ${target}.`)
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error
        issues.push(`${file}: missing local link target ${target}.`)
      }
    }
  }
  return issues
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd()
  // Check all document targets so deleting a file also catches incoming links in unchanged docs.
  const files = await documentationFiles(root)
  const issues = await checkDocumentation(root, files)
  for (const issue of issues) console.error(issue)
  if (issues.length) process.exitCode = 1
  else
    console.log(
      `Documentation links passed: ${files.length} files (local paths and Markdown headings).`,
    )
  if (process.argv.includes('--changed-format')) {
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
    const changed = changedFiles(process.env.GITHUB_EVENT_NAME, event)
    if (!changed) throw new Error('Cannot prove the changed documentation scope.')
    const selected = changed.filter((file) => files.includes(file))
    if (selected.length) {
      const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
      const version = packageJson.devDependencies.prettier
      if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Prettier must use an exact version.')
      const result = spawnSync(
        'pnpm',
        [
          'dlx',
          `prettier@${version}`,
          '--check',
          '--config',
          'scripts/prettier-docs.config.mjs',
          '--',
          ...selected,
        ],
        { cwd: root, stdio: 'inherit' },
      )
      if (result.error) throw result.error
      if (result.status !== 0) process.exitCode = 1
    }
  }
}
