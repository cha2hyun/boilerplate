import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkArchitecture, checkFile } from './check-architecture.mjs'
import { checkSearchRuntimeGraph, searchEntrypoints } from './search-entrypoints.mjs'

const entry = 'pages/overview/search.ts'
const entrySource = `export { schema, type Search } from './model/search'`
const graph = (files) => checkSearchRuntimeGraph(new Map(Object.entries(files)))
const rules = (file, source) => checkFile(file, source).map((issue) => issue.rule)

test('only the six page and two widget search entrypoints extend the public API', () => {
  assert.equal(searchEntrypoints.size, 8)
  for (const file of searchEntrypoints) {
    const target = file.replace(/\.ts$/, '')
    assert.deepEqual(rules('app/routes/index.tsx', `import { schema } from '@/${target}'`), [])
    assert.deepEqual(rules('app/routes/index.tsx', `export { schema } from '/src/${file}'`), [])
  }
  for (const target of [
    'pages/settings/search',
    'pages/overview/model/search',
    'pages/overview/search/index',
    'widgets/app-shell/search',
    'entities/order/search',
  ]) {
    assert.deepEqual(rules('app/routes/index.tsx', `import { schema } from '@/${target}'`), [
      'public-api',
    ])
  }
  assert.deepEqual(
    rules(
      'widgets/project-table/model/search.ts',
      `import { schema } from '@/pages/overview/search'`,
    ),
    ['layer-direction'],
  )
  assert.deepEqual(
    rules('pages/projects/model/search.ts', `import { schema } from '@/pages/overview/search'`),
    ['slice-isolation'],
  )
  assert.deepEqual(
    rules(
      'widgets/project-table/model/search.ts',
      `import type { Search } from '@/widgets/revenue-chart/search'`,
    ),
    ['slice-isolation'],
  )
})

test('search entrypoints only re-export existing named values and types', () => {
  assert.deepEqual(rules(entry, entrySource), [])
  assert.deepEqual(rules(entry, `export type { Search } from './model/search'`), [])
  for (const source of [
    `export * from './model/search'`,
    `export * as contracts from './model/search'`,
    `export { default as schema } from './model/search'`,
    `export { schema as default } from './model/search'`,
    `import { schema } from './model/search'; export { schema }`,
    `export const schema = z.object({})`,
    `export type Search = { page: number }`,
    `import './model/search'`,
    `export {} from './model/search'`,
    '',
  ]) {
    assert.ok(rules(entry, source).includes('search-entry-export'), source)
  }
})

test('data-only entity barrels and cyclic helpers remain valid runtime dependencies', () => {
  assert.deepEqual(
    graph({
      [entry]: entrySource,
      'pages/overview/model/search.ts': `import { schema } from '@/entities/project'; export { schema }`,
      'entities/project/index.ts': `export { schema } from './model/schema'; export { query } from './api/query'`,
      'entities/project/model/schema.ts': `import { z } from 'zod'; export const schema = z.object({})`,
      'entities/project/api/query.ts': `import { queryOptions } from '@tanstack/react-query'; import { helper } from './helper'; export const query = () => queryOptions(helper())`,
      'entities/project/api/helper.ts': `import { query } from './query'; export const helper = () => query`,
    }),
    [],
  )
})

test('declaration-level type imports and re-exports do not connect UI to the runtime graph', () => {
  assert.deepEqual(
    graph({
      [entry]: entrySource,
      'pages/overview/model/search.ts': `
        import type { Chart } from '@/shared/ui/chart'
        import type { Button } from '@/shared/ui/button'
        export type { Page } from '../ui/overview-page'
        export type { ReactNode } from 'react'
        export { type OtherNode } from 'react'
        type Other = import('@/shared/ui/dialog').Dialog
        export const schema = {}
      `,
    }),
    [],
  )
})

test('inline-only type imports still evaluate modules under verbatimModuleSyntax', () => {
  const issues = graph({
    [entry]: entrySource,
    'pages/overview/model/search.ts': `import { type Button } from '@/shared/ui/button'`,
  })
  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /side-effect-only/)
})

test('follows mixed runtime imports and indirect barrel re-exports into UI', () => {
  const issues = graph({
    [entry]: entrySource,
    'pages/overview/model/search.ts': `import { type Search, schema } from './bridge'; export { schema }`,
    'pages/overview/model/bridge.ts': `export { schema } from '@/entities/project'`,
    'entities/project/index.ts': `export { schema } from './model/schema'; export { Badge } from './ui/badge'`,
    'entities/project/model/schema.ts': `export const schema = {}`,
  })
  assert.equal(issues.length, 1)
  assert.equal(issues[0].file, 'entities/project/index.ts')
  assert.equal(issues[0].rule, 'search-entry-runtime')
  assert.match(issues[0].message, /pages\/overview\/search\.ts.*model\/bridge\.ts.*ui\/badge/)
})

test('rejects TSX resolved through an extensionless data-looking path', () => {
  const issues = graph({
    [entry]: entrySource,
    'pages/overview/model/search.ts': `export { schema } from './helper'`,
    'pages/overview/model/helper.tsx': `export const schema = {}`,
  })
  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /UI\/컴포넌트/)
})

test('rejects component libraries, UI, styles, side-effect-only and dynamic import bypasses', () => {
  for (const source of [
    `import { createElement } from 'react'`,
    `export { Area } from 'recharts'`,
    `export * from 'radix-ui'`,
    `import { Command } from 'cmdk'`,
    `import { Icon } from 'lucide-react'`,
    `const module = import('@/shared/ui/button')`,
    `const module = require('@/shared/ui/button')`,
    `import module = require('@/shared/ui/button')`,
    `import '@/shared/lib/polyfill'`,
    `import {} from '@/shared/lib/polyfill'`,
    `import '@/app/styles/globals.css'`,
    'const module = import(`./${name}`)',
  ]) {
    const issues = graph({ [entry]: entrySource, 'pages/overview/model/search.ts': source })
    assert.equal(issues.length, 1, source)
    assert.equal(issues[0].rule, 'search-entry-runtime', source)
  }
})

test('unresolved internal graph edges fail instead of assuming they contain no UI', () => {
  const issues = graph({
    [entry]: entrySource,
    'pages/overview/model/search.ts': `export { schema } from './missing'`,
  })
  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /해석할 수 없는/)
})

test('the repository architecture check includes the transitive search graph', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'blueprint-search-boundary-'))
  try {
    const files = {
      [entry]: entrySource,
      'pages/overview/model/search.ts': `export { schema } from '@/shared/lib/contracts'`,
      'shared/lib/contracts.ts': `export { schema } from '../ui/button'`,
      'shared/ui/button.tsx': `export const schema = {}`,
    }
    for (const [file, contents] of Object.entries(files)) {
      const filename = path.join(root, 'src', file)
      await mkdir(path.dirname(filename), { recursive: true })
      await writeFile(filename, contents)
    }
    const issues = await checkArchitecture(root)
    assert.equal(issues.length, 1)
    assert.equal(issues[0].rule, 'search-entry-runtime')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
