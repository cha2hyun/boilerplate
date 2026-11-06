import { spawnSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { changedFiles } from './ci-scope.mjs'
import { inlineLinks, proseOnly } from './markdown-links.mjs'

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
  for (const file of files) {
    const prose = proseOnly(await readFile(path.join(root, file), 'utf8'))
    const targets = inlineLinks(prose, file, issues).map(({ target }) => target)
    // README previews use HTML picture/img tags as well as Markdown images.
    for (const match of prose.matchAll(
      /<(?:img|source|a)\b[^>]*\b(?:src|srcset|href)="([^"]+)"/g,
    )) {
      targets.push(...match[1].split(',').map((item) => item.trim().split(/\s+/)[0]))
    }
    for (const target of targets) {
      const unescaped = target.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1')
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(unescaped)) continue
      let decoded
      try {
        decoded = decodeURIComponent(unescaped.split(/[?#]/, 1)[0])
      } catch {
        issues.push(`${file}: invalid URL encoding in link ${target}.`)
        continue
      }
      const resolved = path.resolve(root, path.dirname(file), decoded)
      const relative = path.relative(root, resolved)
      if (
        !decoded ||
        path.isAbsolute(decoded) ||
        relative === '..' ||
        relative.startsWith(`..${path.sep}`)
      ) {
        issues.push(`${file}: local link must stay inside the repository: ${target}.`)
        continue
      }
      try {
        await stat(resolved)
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
  else console.log(`Documentation links passed: ${files.length} files (local file targets only).`)
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
