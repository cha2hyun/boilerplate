import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const categories = ['core', 'samples']
const testFilePattern = /\.(?:spec|test)\.[cm]?[jt]sx?$/

/** CI categories must partition every browser spec; convenience scripts are not categories. */
export function checkCategoryScripts(scripts, testFiles) {
  const issues = []
  const discovered = new Set(testFiles)
  const assignments = new Map()

  for (const category of categories) {
    const scriptName = `test:e2e:${category}`
    const command = scripts[scriptName]?.trim().split(/\s+/) ?? []
    const [runner, action, ...files] = command
    if (runner !== 'playwright' || action !== 'test' || files.length === 0) {
      issues.push(`${scriptName}: use "playwright test" followed by explicit e2e spec paths.`)
      continue
    }
    for (const file of files) {
      if (!discovered.has(file)) {
        issues.push(`${scriptName}: unknown spec path "${file}". Use an existing explicit path.`)
        continue
      }
      const owners = assignments.get(file) ?? []
      owners.push(category)
      assignments.set(file, owners)
    }
  }

  for (const file of [...discovered].sort()) {
    const owners = assignments.get(file) ?? []
    if (owners.length === 0) issues.push(`${file}: missing from core/samples CI categories.`)
    if (owners.length > 1) issues.push(`${file}: listed more than once (${owners.join(', ')}).`)
  }
  return issues
}

export async function checkE2eCategories(root = process.cwd()) {
  const { scripts } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const entries = await readdir(path.join(root, 'e2e'), { recursive: true, withFileTypes: true })
  const testFiles = entries
    .filter((entry) => entry.isFile() && testFilePattern.test(entry.name))
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
    )
  return checkCategoryScripts(scripts ?? {}, testFiles)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = await checkE2eCategories()
  if (issues.length) {
    for (const issue of issues) console.error(issue)
    process.exitCode = 1
  } else {
    console.log('E2E categories passed: every spec belongs to exactly one CI category.')
  }
}
