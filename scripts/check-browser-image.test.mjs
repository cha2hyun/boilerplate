import assert from 'node:assert/strict'
import test from 'node:test'
import { checkBrowserImage } from './check-browser-image.mjs'

test('requires an exact package/image version, noble distribution, and immutable digest', () => {
  const packageJson = { devDependencies: { '@playwright/test': '1.64.1' } }
  const image = `mcr.microsoft.com/playwright:v1.64.1-noble@sha256:${'a'.repeat(64)}`
  assert.deepEqual(checkBrowserImage(packageJson, `    image: ${image}\n`), [])
  for (const invalid of [
    '',
    image.replace('1.64.1', '1.64.0'),
    image.replace('noble', 'jammy'),
    image.split('@')[0],
    `${image}\n    image: ${image}`,
  ]) {
    assert.equal(checkBrowserImage(packageJson, `    image: ${invalid}\n`).length, 1)
  }
  assert.equal(
    checkBrowserImage({ devDependencies: { '@playwright/test': '^1.64.1' } }, ` image: ${image}`)
      .length,
    1,
  )
})
