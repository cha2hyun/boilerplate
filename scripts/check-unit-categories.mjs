import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unitTestCategories, unitTestFileGlob } from './unit-test-categories.ts'

// Discover JS/TS test conventions broadly so unsupported names cannot disappear silently.
const candidatePattern = /\.(?:test|spec)\.[cm]?[jt]sx?$/

export async function checkUnitCategories(root = process.cwd(), categories = unitTestCategories) {
  const entries = await readdir(path.join(root, 'src'), { recursive: true, withFileTypes: true })
  const testFiles = entries
    .filter((entry) => entry.isFile() && candidatePattern.test(entry.name))
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
    )
    .sort()
  const issues = []
  const categoryNames = new Set()

  for (const { name } of categories) {
    if (categoryNames.has(name)) issues.push(`Duplicate unit category name "${name}".`)
    categoryNames.add(name)
  }

  for (const file of testFiles) {
    if (!path.matchesGlob(file, unitTestFileGlob)) {
      issues.push(`${file}: unsupported unit test name. Use .test.ts(x) or .spec.ts(x).`)
      continue
    }
    const owners = categories.filter(({ include }) =>
      include.some((pattern) => path.matchesGlob(file, pattern)),
    )
    if (owners.length === 0) issues.push(`${file}: missing from unit test categories.`)
    if (owners.length > 1) {
      issues.push(
        `${file}: belongs to multiple unit categories (${owners.map(({ name }) => name).join(', ')}).`,
      )
    }
  }
  return issues
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = await checkUnitCategories()
  if (issues.length) {
    for (const issue of issues) console.error(issue)
    process.exitCode = 1
  } else {
    console.log('Unit categories passed: every source test belongs to exactly one category.')
  }
}
