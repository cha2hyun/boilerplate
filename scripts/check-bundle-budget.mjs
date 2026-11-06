import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

// main 539d38b: 808,877 raw / 255,590 gzip bytes. About 10% explicit growth room.
// See docs/testing.md; changes to these limits need a measured reason in the PR.
export const initialJavaScriptBudget = { bytes: 890_000, gzipBytes: 282_000 }

export async function measureInitialJavaScript(dist) {
  const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'))
  if (!manifest?.['index.html']?.isEntry) throw new Error('Missing index.html build entry.')
  const visited = new Set()
  const files = new Map()
  async function visit(key) {
    if (visited.has(key)) return
    visited.add(key)
    const chunk = manifest[key]
    if (!chunk || typeof chunk.file !== 'string' || !/\.m?js$/.test(chunk.file)) {
      throw new Error(`Missing JavaScript manifest chunk: ${key}`)
    }
    const relative = path.relative(path.resolve(dist), path.resolve(dist, chunk.file))
    if (!relative || relative.startsWith('..') || path.isAbsolute(chunk.file)) {
      throw new Error(`Build asset must stay inside dist: ${chunk.file}`)
    }
    if (!files.has(chunk.file)) {
      const bytes = await readFile(path.join(dist, chunk.file))
      files.set(chunk.file, {
        file: chunk.file,
        bytes: bytes.length,
        gzipBytes: gzipSync(bytes, { level: 6 }).length,
      })
    }
    if (chunk.imports !== undefined && !Array.isArray(chunk.imports)) {
      throw new Error(`Invalid static imports for ${key}`)
    }
    // Lazy route/demo imports are deliberately outside this initial static graph.
    for (const imported of chunk.imports ?? []) await visit(imported)
  }
  await visit('index.html')
  const assets = [...files.values()].sort((left, right) => left.file.localeCompare(right.file))
  return {
    bytes: assets.reduce((total, asset) => total + asset.bytes, 0),
    gzipBytes: assets.reduce((total, asset) => total + asset.gzipBytes, 0),
    assets,
  }
}

export function checkBundleBudget(measurement, budget = initialJavaScriptBudget) {
  return ['bytes', 'gzipBytes'].flatMap((metric) =>
    measurement[metric] > budget[metric]
      ? [`Initial JavaScript ${metric}: ${measurement[metric]} exceeds ${budget[metric]}.`]
      : [],
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const measurement = await measureInitialJavaScript(path.resolve(process.argv[2] ?? 'dist'))
  const issues = checkBundleBudget(measurement)
  console.log(JSON.stringify({ ...measurement, budget: initialJavaScriptBudget }, null, 2))
  for (const issue of issues) console.error(issue)
  if (issues.length) process.exitCode = 1
}
