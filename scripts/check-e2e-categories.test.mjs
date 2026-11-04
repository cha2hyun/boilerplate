import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkCategoryScripts, checkE2eCategories } from './check-e2e-categories.mjs'

const scripts = {
  'test:e2e:core': 'playwright test e2e/workspace.spec.ts',
  'test:e2e:samples': 'playwright test e2e/orders.spec.ts',
  'test:e2e:workspace': 'playwright test e2e/workspace.spec.ts',
}
const testFiles = ['e2e/workspace.spec.ts', 'e2e/orders.spec.ts']

test('accepts a complete partition without counting convenience commands twice', () => {
  assert.deepEqual(checkCategoryScripts(scripts, testFiles), [])
})

test('rejects new specs that neither CI category will execute', () => {
  assert.deepEqual(checkCategoryScripts(scripts, [...testFiles, 'e2e/billing.spec.ts']), [
    'e2e/billing.spec.ts: missing from core/samples CI categories.',
  ])
})

test('rejects duplicate specs both within one category and across categories', () => {
  for (const category of ['core', 'samples']) {
    const key = `test:e2e:${category}`
    const issues = checkCategoryScripts(
      { ...scripts, [key]: `${scripts[key]} e2e/workspace.spec.ts` },
      testFiles,
    )
    assert.equal(issues.length, 1)
    assert.match(issues[0], /e2e\/workspace\.spec\.ts: listed more than once/)
  }
})

test('rejects stale paths even if all existing specs remain covered', () => {
  assert.deepEqual(
    checkCategoryScripts(
      { ...scripts, 'test:e2e:core': `${scripts['test:e2e:core']} e2e/deleted.spec.ts` },
      testFiles,
    ),
    ['test:e2e:core: unknown spec path "e2e/deleted.spec.ts". Use an existing explicit path.'],
  )
})

test('rejects missing categories and opaque commands instead of assuming they execute all specs', () => {
  for (const command of [undefined, 'pnpm test:e2e', 'playwright test']) {
    const issues = checkCategoryScripts({ ...scripts, 'test:e2e:core': command }, testFiles)
    assert.equal(issues.length, 2)
    assert.match(issues[0], /^test:e2e:core: use/)
    assert.match(issues[1], /workspace\.spec\.ts: missing/)
  }
})

test('discovers nested browser specs on disk while ignoring fixtures', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'e2e-categories-'))
  try {
    await mkdir(path.join(root, 'e2e', 'nested'), { recursive: true })
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts }))
    for (const file of [...testFiles, 'e2e/fixtures.ts', 'e2e/nested/billing.test.tsx']) {
      await writeFile(path.join(root, file), '')
    }
    assert.deepEqual(await checkE2eCategories(root), [
      'e2e/nested/billing.test.tsx: missing from core/samples CI categories.',
    ])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
