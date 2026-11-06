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
      '[Home](../README.md)\n`[Example](missing)`\n```md\n[Example](missing)\n```\n[External](https://example.com)\n',
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
    assert.equal((await checkDocumentation(root, files)).length, 4)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
