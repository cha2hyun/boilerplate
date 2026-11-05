import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkPageSpecs, requiredSections } from './check-page-specs.mjs'

function specification(route = '/') {
  return `# Page\n\n<!-- page-route: ${route} -->\n\n${requiredSections
    .map(
      (section) =>
        `## ${section}\n\n${section === '상태 소유권과 구현 근거' ? '[Source](../../src/app/routes/index.tsx)' : section === '수용 기준' ? '[Test](../../e2e/page.spec.ts)' : '설명.'}\n`,
    )
    .join('\n')}`
}

async function fixture(t, overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'page-specs-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const files = {
    'src/app/routes/index.tsx': "export const Route = createFileRoute('/')({})",
    'src/app/routes/__root.tsx': 'root shell',
    'e2e/page.spec.ts': 'test source',
    'docs/pages/README.md': '# Page specs\n',
    'docs/pages/_template.md': '# Template\n',
    'docs/pages/overview.md': specification(),
    ...overrides,
  }
  for (const [file, content] of Object.entries(files)) {
    if (content === null) continue
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), content)
  }
  return root
}

test('accepts static route coverage and existing escaped, encoded, and angle-wrapped local links', async (t) => {
  const root = await fixture(t, {
    'docs/evidence (old).md': 'evidence',
    'docs/pages/overview.md': `${specification()}\n[Escaped](../evidence%20\\(old\\).md)\n[Encoded](../evidence%20%28old%29.md#section)\n[Angle](<../evidence (old).md>)\n[Remote](https://example.com/missing)\n[Anchor](#missing)\n\`[Code](missing.md)\`\n\n\`\`\`md\n[Example](missing.md)\n\`\`\`\n`,
  })
  assert.deepEqual(await checkPageSpecs(root), [])
})

test('reports missing route specifications and unsupported route declarations instead of skipping them', async (t) => {
  const root = await fixture(t, {
    'src/app/routes/orders.tsx': "export const Route = createFileRoute('/orders')({})",
    'src/app/routes/dynamic.tsx': 'export const Route = createFileRoute(routeName)({})',
  })
  const issues = await checkPageSpecs(root)
  assert.ok(issues.some((issue) => issue.includes('/orders: missing page specification')))
  assert.ok(issues.some((issue) => issue.includes('dynamic.tsx: expected one static')))
})

test('supports named dynamic segments and normalizes index trailing slashes to canonical spec filenames', async (t) => {
  const root = await fixture(t, {
    'src/app/routes/projects.$projectId.tsx':
      "export const Route = createFileRoute('/projects/$projectId/')({})",
    'src/app/routes/orders.index.tsx': "export const Route = createFileRoute('/orders/')({})",
    'docs/pages/projects-$projectId.md': specification('/projects/$projectId'),
    'docs/pages/orders.md': specification('/orders'),
  })
  assert.deepEqual(await checkPageSpecs(root), [])
  await writeFile(path.join(root, 'docs/pages/orders.md'), specification('/orders/'))
  assert.ok(
    (await checkPageSpecs(root)).some((issue) =>
      issue.includes('use canonical page-route /orders'),
    ),
  )
})

test('reports unknown, duplicate, noncanonical, and malformed specification route declarations', async (t) => {
  const root = await fixture(t, {
    'docs/pages/extra.md': specification(),
    'docs/pages/retired.md': specification('/retired'),
    'docs/pages/broken.md': specification().replace('page-route: /', 'page-route /'),
  })
  const issues = await checkPageSpecs(root)
  assert.ok(issues.some((issue) => issue.includes('duplicate specification for /')))
  assert.ok(issues.some((issue) => issue.includes('canonical filename for / is overview.md')))
  assert.ok(issues.some((issue) => issue.includes('unknown route /retired')))
  assert.ok(issues.some((issue) => issue.includes('expected exactly one')))
})

test('requires nonempty sections and source/test links in their owning sections', async (t) => {
  const root = await fixture(t, {
    'docs/pages/overview.md': specification()
      .replace('## 목적과 범위\n\n설명.', '## 목적과 범위\n')
      .replace('[Source](../../src/app/routes/index.tsx)', '구현 설명.')
      .replace('[Test](../../e2e/page.spec.ts)', '검증 설명.'),
  })
  const issues = await checkPageSpecs(root)
  assert.ok(issues.some((issue) => issue.includes('missing or empty section "목적과 범위"')))
  assert.ok(issues.some((issue) => issue.includes('ownership section needs')))
  assert.ok(issues.some((issue) => issue.includes('acceptance section needs')))
})

test('does not accept directories with source or test filenames as implementation evidence', async (t) => {
  const root = await fixture(t, {
    'docs/pages/overview.md': specification()
      .replace('src/app/routes/index.tsx', 'src/directory.ts')
      .replace('e2e/page.spec.ts', 'e2e/directory.spec.ts'),
  })
  await mkdir(path.join(root, 'src/directory.ts'))
  await mkdir(path.join(root, 'e2e/directory.spec.ts'))
  const issues = await checkPageSpecs(root)
  assert.ok(issues.some((issue) => issue.includes('ownership section needs')))
  assert.ok(issues.some((issue) => issue.includes('acceptance section needs')))
})

test('reports broken, malformed, invalid encoded, and repository-escaping local links', async (t) => {
  const root = await fixture(t, {
    'docs/pages/overview.md': `${specification()}\n[Missing](../missing.md)\n[Broken](../unterminated\n[Encoding](../bad%ZZ.md)\n[Escaped](../../%2e%2e/outside.md)\n[Absolute](/tmp/outside.md)\n`,
  })
  const issues = await checkPageSpecs(root)
  assert.ok(issues.some((issue) => issue.includes('missing local link target ../missing.md')))
  assert.ok(issues.some((issue) => issue.includes('malformed inline link')))
  assert.ok(issues.some((issue) => issue.includes('invalid URL encoding')))
  assert.equal(
    issues.filter((issue) => issue.includes('must stay inside the repository')).length,
    2,
  )
})

test('checks index links and reports absent authoring entry points', async (t) => {
  const root = await fixture(t, {
    'docs/pages/README.md': '[Missing](missing.md)',
    'docs/pages/_template.md': null,
  })
  const issues = await checkPageSpecs(root)
  assert.ok(issues.some((issue) => issue.includes('README.md: missing local link target')))
  assert.ok(issues.some((issue) => issue.includes('_template.md: missing authoring entry point')))
})
