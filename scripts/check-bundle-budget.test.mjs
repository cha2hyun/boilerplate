import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { gzipSync } from 'node:zlib'
import { checkBundleBudget, measureInitialJavaScript } from './check-bundle-budget.mjs'

async function fixture(run) {
  const dist = await mkdtemp(path.join(tmpdir(), 'bundle-budget-'))
  try {
    await mkdir(path.join(dist, '.vite'))
    await mkdir(path.join(dist, 'assets'))
    await run(dist, async (manifest) =>
      writeFile(path.join(dist, '.vite/manifest.json'), JSON.stringify(manifest)),
    )
  } finally {
    await rm(dist, { recursive: true, force: true })
  }
}

test('counts the entry static graph once and ignores lazy routes with deterministic gzip', async () => {
  await fixture(async (dist, manifest) => {
    const entry = 'import "./shared.js"; import("./lazy.js")'
    const shared = 'export const shared = "shared"'
    await writeFile(path.join(dist, 'assets/entry.js'), entry)
    await writeFile(path.join(dist, 'assets/shared.js'), shared)
    await manifest({
      'index.html': {
        isEntry: true,
        file: 'assets/entry.js',
        imports: ['shared', 'alias'],
        dynamicImports: ['lazy'],
      },
      shared: { file: 'assets/shared.js', imports: ['index.html'] },
      alias: { file: 'assets/shared.js' },
      lazy: { file: 'assets/unrequested-lazy.js' },
    })
    const result = await measureInitialJavaScript(dist)
    assert.equal(result.assets.length, 2)
    assert.equal(result.bytes, Buffer.byteLength(entry + shared))
    assert.equal(
      result.gzipBytes,
      gzipSync(entry, { level: 6 }).length + gzipSync(shared, { level: 6 }).length,
    )
    assert.deepEqual(checkBundleBudget(result, result), [])
    assert.equal(checkBundleBudget(result, { bytes: 0, gzipBytes: 0 }).length, 2)
  })
})

test('fails for missing entries, imports, output files, or a path outside dist', async () => {
  await fixture(async (dist, manifest) => {
    await manifest({})
    await assert.rejects(measureInitialJavaScript(dist), /Missing index.html/)
    await writeFile(path.join(dist, 'assets/entry.js'), 'export {}')
    await manifest({
      'index.html': { isEntry: true, file: 'assets/entry.js', imports: ['missing'] },
    })
    await assert.rejects(measureInitialJavaScript(dist), /Missing JavaScript manifest chunk/)
    await manifest({ 'index.html': { isEntry: true, file: '../escaped.js' } })
    await assert.rejects(measureInitialJavaScript(dist), /must stay inside dist/)
    await manifest({ 'index.html': { isEntry: true, file: 'assets/missing.js' } })
    await assert.rejects(measureInitialJavaScript(dist), /ENOENT/)
  })
})
