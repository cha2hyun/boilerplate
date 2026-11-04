import assert from 'node:assert/strict'
import test from 'node:test'
import { checkFile } from './check-architecture.mjs'

const rules = (file, source) => checkFile(file, source).map((issue) => issue.rule)

test('requires the canonical number formatter while preserving date APIs and test fixtures', () => {
  const independentFormatters = `
    new Intl.NumberFormat('en-US').format(1234)
    Intl.NumberFormat('ko-KR').format(1234)
    value.toFixed(2)
    value.toPrecision(3)
  `
  assert.deepEqual(rules('pages/orders/ui/amount.tsx', independentFormatters), [
    'number-format',
    'number-format',
    'number-format',
    'number-format',
  ])
  assert.deepEqual(rules('shared/lib/format.ts', independentFormatters), [])
  assert.deepEqual(rules('shared/lib/format.test.ts', independentFormatters), [])
  assert.deepEqual(
    rules(
      'shared/ui/calendar.tsx',
      `new Intl.DateTimeFormat('en-US').format(date); date.toLocaleString('default', { month: 'short' })`,
    ),
    [],
  )
})

test('allows public lower-layer imports and private same-slice imports', () => {
  assert.deepEqual(
    rules(
      'pages/projects/ui/projects-page.tsx',
      `
    import { CreateProject } from '@/features/create-project'
    import type { Project } from '@/entities/project/index.ts'
    import { Button } from '@/shared/ui/button'
    import { formatDate } from '@/shared/lib/format'
    import { model } from '../model/model'
  `,
    ),
    [],
  )
})

test('rejects upward imports even when relative', () => {
  assert.deepEqual(
    rules('entities/project/index.ts', `export { Page } from '../../pages/projects'`),
    ['layer-direction'],
  )
})

test('rejects sibling slice imports through their public API', () => {
  assert.deepEqual(
    rules(
      'features/create-project/index.ts',
      `import { archive } from '@/features/archive-project'`,
    ),
    ['slice-isolation'],
  )
})

test('rejects private lower-layer imports and layer-wide barrels', () => {
  assert.deepEqual(
    rules(
      'pages/projects/index.ts',
      `
    export { Item } from '@/entities/project/ui/item'
    import { create } from '../../features/create-project/api/create'
    import * as entities from '@/entities'
  `,
    ),
    ['public-api', 'public-api', 'public-api'],
  )
})

test('allows app segments and shared segments to reference each other', () => {
  assert.deepEqual(rules('app/providers/index.tsx', `import { router } from '@/app/router'`), [])
  assert.deepEqual(rules('shared/ui/button.tsx', `import { cn } from '@/shared/lib/utils'`), [])
})

test('rejects internal imports through unknown layers and application entrypoints', () => {
  for (const target of ['@/main', '../../main.tsx', '@/utils', '@/test/setup', '@/']) {
    assert.deepEqual(rules('shared/lib/example.ts', `import '${target}'`), ['unknown-layer'])
  }
  assert.deepEqual(rules('utils/index.ts', `export { App } from '@/app/app'`), ['unknown-layer'])
  assert.deepEqual(rules('utils/value.ts', 'export const value = 1'), ['unknown-layer'])
})

test('allows the explicit application and test setup entrypoints', () => {
  assert.deepEqual(
    rules('main.tsx', `import { App } from '@/app/app'; import '@/app/styles/globals.css'`),
    [],
  )
  assert.deepEqual(
    rules(
      'test/setup.ts',
      `import '@testing-library/jest-dom/vitest'; import { afterEach } from 'vitest'`,
    ),
    [],
  )
})

test('checks dynamic imports, import types, require, and import-equals', () => {
  assert.deepEqual(
    rules(
      'entities/project/model.ts',
      `
    const page = import('@/pages/projects')
    type Page = import('@/pages/projects').Page
    const feature = require('@/features/create-project')
    import feature2 = require('@/features/archive-project')
  `,
    ),
    ['layer-direction', 'layer-direction', 'layer-direction', 'layer-direction'],
  )
})

test('rejects computed dynamic imports and module globs', () => {
  const source = [
    'const feature = import(`@/features/${name}`)',
    'const routes = import.meta.glob("../**/*.tsx")',
  ].join('\n')
  assert.deepEqual(rules('pages/home/index.ts', source), ['dynamic-import', 'dynamic-import'])
})

test('comments and arbitrary prose do not become imports', () => {
  assert.deepEqual(
    rules(
      'shared/lib/example.ts',
      `
    // import { Page } from '@/pages/home'
    const example = "import('@/features/create-project')"
  `,
    ),
    [],
  )
})

test('only permits the global token stylesheet and standard shadcn base selectors', () => {
  assert.deepEqual(rules('pages/home/home.css', '.card {}'), ['stylesheet'])
  assert.deepEqual(
    rules(
      'app/styles/globals.css',
      `
    @import "tailwindcss";
    @custom-variant dark (&:is(.dark *));
    :root { --background: oklch(1 0 0); }
    .dark { --background: oklch(0.1 0 0); }
    @theme inline { --color-background: var(--background); }
    @layer base { * { @apply border-border; } body { @apply bg-background; } }
  `,
    ),
    [],
  )
  assert.deepEqual(rules('app/styles/globals.css', '.my-card { color: red; }'), ['custom-css'])
  assert.deepEqual(rules('app/index.tsx', `import 'some-ui/styles.css'`), ['stylesheet-import'])
})

test('requires shadcn controls but allows semantic document elements', () => {
  assert.deepEqual(
    rules(
      'pages/home/ui/home.tsx',
      `
    const Good = () => <main><h1>Home</h1><Button>Save</Button><a href="/">Home</a></main>
  `,
    ),
    [],
  )
  assert.deepEqual(
    rules(
      'pages/home/ui/home.tsx',
      `
    const Bad = () => <><button>Save</button><input /><div role="button">Click</div></>
  `,
    ),
    ['shadcn-control', 'shadcn-control', 'shadcn-control'],
  )
})

test('checks ARIA control roles in JSX string expressions', () => {
  assert.deepEqual(
    rules('pages/home/index.tsx', `const Bad = () => <div role={"button"}>Save</div>`),
    ['shadcn-control'],
  )
  assert.deepEqual(
    rules('pages/home/index.tsx', 'const Bad = () => <div role={`checkbox`}>Select</div>'),
    ['shadcn-control'],
  )
  assert.deepEqual(
    rules('pages/home/index.tsx', `const Good = () => <div role={"status"}>Saved</div>`),
    [],
  )
  assert.deepEqual(
    rules('shared/ui/button.tsx', `const Button = () => <div role={"button"}>Save</div>`),
    [],
  )
})

test('requires stacks for native div flex display and sibling spacing, including variants', () => {
  for (const value of [
    'flex items-center gap-2',
    'inline-flex',
    'md:flex',
    'sm:hover:inline-flex',
    '!flex',
    'md:flex!',
    'space-x-2',
    '-space-y-2',
    'lg:space-y-[1rem]',
    'md:!space-x-4',
    '[display:flex]',
    'sm:[display:inline-flex]',
    '[&:hover]:flex',
    '[@media(min-width:40rem)]:flex',
  ]) {
    assert.deepEqual(
      rules('pages/home/ui/home.tsx', `const Home = () => <div className="${value}" />`),
      ['stack-layout'],
      value,
    )
  }
  const [issue] = checkFile(
    'pages/home/ui/home.tsx',
    `const Home = () => (\n  <div className="flex space-y-2" />\n)`,
  )
  assert.equal(issue.rule, 'stack-layout')
  assert.equal(issue.line, 2)
})

test('finds native div layout in conditional className values and class helper inputs', () => {
  for (const expression of [
    `'flex'`,
    'expanded ? "flex" : "grid"',
    'expanded && "sm:inline-flex"',
    'cn("grid", expanded && "md:flex")',
    'clsx(["w-full", expanded ? "space-y-2" : "gap-2"])',
    'cn({ "md:flex": expanded, hidden: !expanded })',
    'cn({ ["space-x-2"]: expanded })',
    '`w-full ${expanded ? "flex" : "grid"}`',
    '`sm:${expanded ? "flex" : "grid"}`',
    '"inline-" + "flex"',
  ]) {
    assert.deepEqual(
      rules(
        'widgets/header/ui/header.tsx',
        `const Header = () => <div className={${expression}} />`,
      ),
      ['stack-layout'],
      expression,
    )
  }
})

test('keeps grid, child flex sizing, prose, and condition comparisons outside the stack rule', () => {
  assert.deepEqual(
    rules(
      'pages/home/ui/home.tsx',
      `
    const prose = 'flex space-y-2'
    const Home = () => <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3" />
      <div className="grid [&>span]:flex md:[&_svg]:inline-flex *:space-y-2 before:flex [&::after]:flex" />
      <div className="min-w-0 flex-1 md:flex-auto shrink-0" />
      <div className={"flex" + "-1"} />
      <div className={mode === 'flex' ? 'grid' : 'block'} />
      <div className={cn(mode === 'space-y-2' && 'gap-2', { grid: mode === 'flex' })} />
      <div title="inline-flex" data-example="space-y-4" />
      <HStack className="gap-2"><span>Row</span></HStack>
      <VStack align="stretch" justify="between" className="gap-4 md:flex-row md:items-center" />
      <HStack asChild><nav aria-label="Main" /></HStack>
    </>
  `,
    ),
    [],
  )
})

test('leaves shared UI implementations and test fixtures outside stack consumer rules', () => {
  const source = `const Fixture = () => <><div className="flex space-y-2" /><HStack className="items-start" /></>`
  for (const file of [
    'shared/ui/stack.tsx',
    'shared/ui/card.tsx',
    'pages/home/ui/home.test.tsx',
    'widgets/header/ui/header.spec.tsx',
    'shared/lib/__tests__/fixture.tsx',
    'shared/lib/__fixtures__/layout.tsx',
  ]) {
    assert.deepEqual(rules(file, source), [], file)
  }
})

test('requires stack props for base alignment and stack components for base direction', () => {
  for (const tag of ['HStack', 'VStack']) {
    for (const expression of [
      '"items-start"',
      '"!justify-center"',
      '"flex-row!"',
      '"flex-col-reverse"',
      'cn("gap-2", expanded && "items-end")',
      'clsx({ "justify-between": expanded })',
      'expanded ? "flex-col" : "flex-row"',
    ]) {
      assert.deepEqual(
        rules('pages/home/ui/home.tsx', `const Home = () => <${tag} className={${expression}} />`),
        ['stack-props'],
        `${tag}: ${expression}`,
      )
    }
  }
  assert.deepEqual(
    rules(
      'pages/home/ui/home.tsx',
      'const Home = () => <HStack align="start" justify="between" className={cn("gap-2 flex-1", expanded && "md:items-end", `sm:${expanded ? "flex-col" : "flex-row"}`)} />',
    ),
    [],
  )
})

test('allows generated UI primitives but blocks consumer bypasses', () => {
  assert.deepEqual(
    rules(
      'shared/ui/button.tsx',
      `
    import { Slot } from '@radix-ui/react-slot'
    const Button = () => <button style={{ color: 'inherit' }}>Save</button>
  `,
    ),
    [],
  )
  assert.deepEqual(
    rules(
      'features/create-project/ui/form.tsx',
      `
    import { Dialog } from 'radix-ui'
    import { Button } from '@mui/material'
    import styled from 'styled-components'
  `,
    ),
    ['ui-primitive', 'ui-library', 'ui-library'],
  )
})

test('rejects inline CSS and a style tag', () => {
  assert.deepEqual(
    rules(
      'pages/home/index.tsx',
      `
    const Home = () => <div style={{ width: 12 }}><style>{'.x{}'}</style></div>
  `,
    ),
    ['inline-style', 'custom-css'],
  )
})

test('requires semantic colors while allowing Tailwind arbitrary layout values', () => {
  assert.deepEqual(
    rules(
      'pages/home/index.tsx',
      `const classes = 'grid-cols-[1fr_2fr] bg-background text-muted-foreground ring-ring/50'`,
    ),
    [],
  )
  assert.deepEqual(
    rules('pages/home/index.tsx', `const classes = 'bg-blue-500 hover:text-red-600'`),
    ['design-token'],
  )
  assert.deepEqual(rules('pages/home/index.tsx', `const classes = 'bg-[#fff]'`), ['design-token'])
})

test('reports actionable line numbers', () => {
  const [issue] = checkFile('shared/lib/test.ts', `// example\nimport { Home } from '@/pages/home'`)
  assert.equal(issue.line, 2)
  assert.equal(issue.file, 'src/shared/lib/test.ts')
})

test('font weight policy allows only the three named weights, including variants and generated UI', () => {
  assert.deepEqual(
    rules('pages/home/index.tsx', `const classes = 'font-normal md:font-medium xl:font-semibold'`),
    [],
  )
  for (const value of [
    'font-bold',
    'md:hover:font-light',
    'font-[650]',
    '[font-weight:700]',
    'font-(--custom-weight)',
  ]) {
    assert.deepEqual(rules('shared/ui/card.tsx', `const classes = '${value}'`), ['font-weight'])
  }
})

test('font weight theme and emphasis cannot introduce a fourth weight', () => {
  assert.deepEqual(
    rules(
      'app/styles/globals.css',
      '@theme { --font-weight-*: initial; --font-weight-normal: 400; --font-weight-medium: 500; --font-weight-semibold: 600; } @layer base { b,\n strong { @apply font-semibold; } }',
    ),
    [],
  )
  assert.deepEqual(rules('app/styles/globals.css', '@theme { --font-weight-bold: 700; }'), [
    'font-weight',
  ])
  assert.deepEqual(rules('app/styles/globals.css', '@theme { --font-weight-medium: 550; }'), [
    'font-weight',
  ])
})

test('semantic color policy rejects fixed neutral utilities in application code but retains official overlays', () => {
  assert.deepEqual(rules('pages/home/index.tsx', `const classes = 'dark:text-white bg-black/50'`), [
    'design-token',
  ])
  assert.deepEqual(rules('shared/ui/dialog.tsx', `const classes = 'bg-black/50'`), [])
  assert.deepEqual(
    rules('pages/home/index.tsx', `const classes = 'bg-brand text-brand-foreground border-border'`),
    [],
  )
})

test('semantic color policy also covers chart and SVG colors', () => {
  assert.deepEqual(
    rules(
      'pages/analytics/index.tsx',
      `const config = { color: '#123456' }; const chart = <Area stroke="blue" />`,
    ),
    ['design-token', 'design-token'],
  )
  assert.deepEqual(
    rules(
      'pages/analytics/index.tsx',
      `const config = { color: 'var(--chart-2)' }; const chart = <Area stroke="var(--chart-2)" fill="url(#revenue)" />`,
    ),
    [],
  )
})
