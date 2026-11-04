import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkUnitCategories } from './check-unit-categories.mjs'
import { unitTestCategories, unitTestFileGlob } from './unit-test-categories.ts'

async function fixture(t, files) {
  const root = await mkdtemp(path.join(tmpdir(), 'unit-categories-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const file of files) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), '')
  }
  return root
}

test('discovers both test and spec TS/TSX files in every category and ignores helpers', async (t) => {
  const roots = [
    'src/shared/api',
    'src/shared/config',
    'src/shared/lib/nested',
    'src/entities/project/api',
    'src/features/editor/model',
    'src/app/providers',
    'src/pages/projects/ui',
    'src/widgets/project-table/ui',
    'src/shared/ui',
    'src/shared/hooks',
  ]
  const files = roots.flatMap((root) =>
    ['test.ts', 'test.tsx', 'spec.ts', 'spec.tsx'].map((suffix) => `${root}/contract.${suffix}`),
  )
  const root = await fixture(t, [
    ...files,
    'src/test/setup.ts',
    'src/shared/new-segment/helper.ts',
    'e2e/browser.spec.ts',
    'scripts/guardrail.test.mjs',
  ])
  assert.deepEqual(await checkUnitCategories(root), [])
})

test('rejects tests in a new shared segment and an unassigned source location', async (t) => {
  const root = await fixture(t, [
    'src/shared/storage/nested/preferences.spec.ts',
    'src/test/orphan.test.tsx',
  ])
  assert.deepEqual(await checkUnitCategories(root), [
    'src/shared/storage/nested/preferences.spec.ts: missing from unit test categories.',
    'src/test/orphan.test.tsx: missing from unit test categories.',
  ])
})

test('rejects overlap between project globs without counting repeated includes twice', async (t) => {
  const root = await fixture(t, ['src/shared/api/client.test.ts'])
  const overlap = { name: 'overlap', include: [`src/shared/${unitTestFileGlob}`] }
  assert.deepEqual(await checkUnitCategories(root, [...unitTestCategories, overlap]), [
    'src/shared/api/client.test.ts: belongs to multiple unit categories (foundations, overlap).',
  ])
  assert.deepEqual(
    await checkUnitCategories(root, [
      { name: 'single', include: [unitTestFileGlob, `src/shared/${unitTestFileGlob}`] },
    ]),
    [],
  )
})

test('rejects duplicate named projects even when their test paths are disjoint', async (t) => {
  const root = await fixture(t, ['src/shared/api/client.test.ts', 'src/app/provider.spec.tsx'])
  assert.deepEqual(
    await checkUnitCategories(root, [
      { name: 'same', include: [`src/shared/${unitTestFileGlob}`] },
      { name: 'same', include: [`src/app/${unitTestFileGlob}`] },
    ]),
    ['Duplicate unit category name "same".'],
  )
})

test('rejects unsupported JS and module test extensions instead of silently skipping them', async (t) => {
  const files = ['test.js', 'spec.jsx', 'test.mjs', 'spec.cjs', 'test.mts', 'spec.cts'].map(
    (suffix) => `src/shared/api/client.${suffix}`,
  )
  const root = await fixture(t, files)
  assert.deepEqual(
    await checkUnitCategories(root),
    files
      .sort()
      .map((file) => `${file}: unsupported unit test name. Use .test.ts(x) or .spec.ts(x).`),
  )
})
