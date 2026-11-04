import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { changedFiles, requiresFullCI } from './ci-scope.mjs'
import { checkCIGate } from './check-ci-gate.mjs'

const successful = {
  changes: { result: 'success', outputs: { full: 'true' } },
  quality: { result: 'success' },
  browser: { result: 'success' },
}

test('only known documentation paths skip the expensive CI jobs', () => {
  assert.equal(requiresFullCI(['README.md', 'AGENTS.md', 'docs/design/layout.md']), false)
  for (const files of [
    null,
    [],
    ['README.md', 'src/main.tsx'],
    ['docs/example.ts'],
    ['.github/workflows/ci.yml'],
    ['new.config'],
    ['public/example.md'],
  ]) {
    assert.equal(requiresFullCI(files), true)
  }
})

test('unavailable history and explicit manual runs require full CI', () => {
  assert.equal(changedFiles('workflow_dispatch', {}), null)
  assert.equal(changedFiles('push', { before: '0'.repeat(40), after: 'a'.repeat(40) }), null)
  assert.equal(changedFiles('push', { before: '--invalid', after: 'a'.repeat(40) }), null)
  assert.equal(changedFiles('push', { before: 'a'.repeat(40), after: 'b'.repeat(40) }), null)
})

test('real git comparisons preserve renamed source paths and isolate PR changes from base updates', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'ci-scope-'))
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=CI test', '-c', 'user.email=ci@example.test', ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  try {
    git('init', '-b', 'main')
    await mkdir(path.join(cwd, 'src'))
    await mkdir(path.join(cwd, 'docs'))
    await writeFile(path.join(cwd, 'src/example.ts'), 'export const example = 1\n')
    git('add', '.')
    git('commit', '-m', 'initial')
    const initial = git('rev-parse', 'HEAD')
    git('checkout', '-b', 'docs')
    await writeFile(path.join(cwd, 'docs/with space\nand newline.md'), '# Guide\n')
    git('add', '.')
    git('commit', '-m', 'documentation')
    const documentation = git('rev-parse', 'HEAD')
    git('checkout', 'main')
    await writeFile(path.join(cwd, 'src/base-only.ts'), 'export const base = 1\n')
    git('add', '.')
    git('commit', '-m', 'base update')
    const base = git('rev-parse', 'HEAD')
    const files = changedFiles(
      'pull_request',
      { pull_request: { base: { sha: base }, head: { sha: documentation } } },
      cwd,
    )
    assert.deepEqual(files, ['docs/with space\nand newline.md'])
    assert.equal(requiresFullCI(files), false)

    git('checkout', 'docs')
    await rename(path.join(cwd, 'src/example.ts'), path.join(cwd, 'docs/example.md'))
    git('add', '.')
    git('commit', '-m', 'move source to docs')
    const renamed = changedFiles(
      'push',
      { before: documentation, after: git('rev-parse', 'HEAD') },
      cwd,
    )
    assert.deepEqual(renamed, ['docs/example.md', 'src/example.ts'])
    assert.equal(requiresFullCI(renamed), true)
    assert.equal(requiresFullCI(changedFiles('push', { before: initial, after: base }, cwd)), true)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('the final gate accepts successful code checks or explicitly skipped documentation checks', () => {
  assert.deepEqual(checkCIGate(successful), [])
  assert.deepEqual(
    checkCIGate({
      changes: { result: 'success', outputs: { full: 'false' } },
      quality: { result: 'skipped' },
      browser: { result: 'skipped' },
    }),
    [],
  )
})

test('the final gate rejects failures, cancellations, unexpected skips, and missing results', () => {
  for (const job of ['changes', 'quality', 'browser']) {
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      assert.ok(checkCIGate({ ...successful, [job]: { ...successful[job], result } }).length > 0)
    }
  }
  for (const full of [undefined, '', 'unknown']) {
    assert.ok(
      checkCIGate({ ...successful, changes: { result: 'success', outputs: { full } } }).length > 0,
    )
  }
  assert.ok(checkCIGate({}).length > 0)
})
