import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkDocumentation, documentationFiles } from './check-docs.mjs'

test('checks root/topic Markdown and HTML image targets, preserving fenced examples', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'docs-links-'))
  try {
    await mkdir(path.join(root, 'docs'))
    await writeFile(
      path.join(root, 'README.md'),
      '[Topic](docs/topic.md#section)\n<img src="docs/image.png" />\n',
    )
    await writeFile(path.join(root, 'docs/image.png'), '')
    await writeFile(
      path.join(root, 'docs/topic.md'),
      '## Section\n[Home](../README.md)\n`[Example](missing)`\n```md\n[Example](missing)\n```\n[External](https://example.com)\n',
    )
    const files = await documentationFiles(root)
    assert.deepEqual(files, ['README.md', 'docs/topic.md'])
    assert.deepEqual(await checkDocumentation(root, files), [])
    // Incoming references fail even when the linking document was not itself changed.
    await rm(path.join(root, 'docs/image.png'))
    assert.match(
      (await checkDocumentation(root, files))[0],
      /missing local link target docs\/image/,
    )
    await writeFile(
      path.join(root, 'docs/topic.md'),
      '[Outside](../../secret)\n[Invalid](%E0%A4%A)\n[Broken](missing.md)\n',
    )
    const issues = await checkDocumentation(root, files)
    assert.equal(issues.length, 5)
    assert.ok(
      issues.some((issue) =>
        issue.includes('missing Markdown heading in link docs/topic.md#section'),
      ),
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('resolves local ATX headings, code spans, Korean, escaped URLs and duplicate slugs', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'docs-anchors-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'docs'))
  const links = [
    '[Same](#같은-파일)',
    '[Other](docs/guide%20%231.md?view=1#%ED%95%9C%EA%B8%80-api-key_name)',
    '[Duplicate](docs/guide%20%231.md#한글-api-key_name-1)',
    '[Suffix collision](docs/guide%20%231.md#한글-api-key_name-1-1)',
    '[Third](docs/guide%20%231.md#한글-api-key_name-2)',
    '[Formatting](docs/guide%20%231.md#버튼-및-고객)',
    '[Non-Markdown fragment](docs/source.ts#L12)',
    '[External](https://example.invalid/#unknown)',
    '`[Inline example](#unknown)`',
    '```md\n[Example](#unknown)\n```',
  ]
  await writeFile(path.join(root, 'README.md'), ['# 같은 파일', ...links].join('\n'))
  await writeFile(path.join(root, 'docs/source.ts'), '')
  await writeFile(
    path.join(root, 'docs/guide #1.md'),
    [
      '# 한글 API `key_name`!',
      '## 한글 API `key_name`! ###',
      '### 한글 API `key_name-1`',
      '#### 한글 API `key_name`!',
      '## _버튼_ 및 [고객](../README.md)',
      '~~~~',
      '## 가짜 제목',
      '~~~',
      '## 가짜 제목 2',
      '~~~~',
      '`## 인라인 예제`',
    ].join('\r\n'),
  )
  const files = await documentationFiles(root)
  assert.deepEqual(await checkDocumentation(root, files), [])

  const invalid = [
    '#없는-절',
    'docs/guide%20%231.md#가짜-제목',
    'docs/guide%20%231.md#가짜-제목-2',
    'docs/guide%20%231.md#인라인-예제',
    'docs/guide%20%231.md#한글-api-key_name-3',
  ]
  await writeFile(
    path.join(root, 'README.md'),
    [...invalid, '#%ZZ'].map((target) => `[Broken](${target})`).join('\n'),
  )
  assert.deepEqual(await checkDocumentation(root, files), [
    ...invalid.map((target) => `README.md: missing Markdown heading in link ${target}.`),
    'README.md: invalid URL encoding in link #%ZZ.',
  ])
})
