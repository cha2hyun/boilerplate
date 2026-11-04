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
      'pages/projects/ui/project-content.tsx',
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
    const Good = () => <main><h2>Home</h2><Button>Save</Button><a href="/">Home</a></main>
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

test('page content delegates native and ARIA level-one headings to PageHeader', () => {
  for (const heading of [
    '<h1>Inbox</h1>',
    '<div role="heading" aria-level="1">Inbox</div>',
    '<span role={"heading"} aria-level={1}>Inbox</span>',
    '<span role={`heading`} aria-level={(1 as const)}>Inbox</span>',
  ]) {
    assert.deepEqual(rules('pages/inbox/ui/intro.tsx', `const Intro = () => ${heading}`), [
      'page-header',
    ])
  }
  assert.deepEqual(
    rules(
      'pages/inbox/ui/intro.tsx',
      'const Intro = () => <><h2>Messages</h2><span role="heading" aria-level={2}>Details</span></>',
    ),
    [],
  )
  for (const file of [
    'shared/ui/page-header.tsx',
    'pages/inbox/ui/inbox-page.test.tsx',
    'pages/inbox/__fixtures__/inbox-page.tsx',
  ]) {
    assert.deepEqual(rules(file, 'const Fixture = () => <h1>Inbox</h1>'), [], file)
  }
})

test('page entrypoints require a used value import from the actual PageHeader module', () => {
  for (const source of [
    'export function InboxPage() { return <p>Inbox</p> }',
    'const PageHeader = () => <p />; export default () => <PageHeader />',
    'import { PageHeader } from "@/shared/ui/card"; export default () => <PageHeader title="Inbox" />',
    'import type { PageHeader } from "@/shared/ui/page-header"; export default () => <PageHeader title="Inbox" />',
    'import { type PageHeader } from "@/shared/ui/page-header"; export default () => <PageHeader title="Inbox" />',
    'import PageHeader from "@/shared/ui/page-header"; export default () => <PageHeader title="Inbox" />',
    'import { PageHeader } from "@/shared/ui/page-header"; export default () => <p>PageHeader</p>',
  ]) {
    assert.deepEqual(rules('pages/inbox/ui/inbox-page.tsx', source), ['page-header-required'])
  }
})

test('accepts PageHeader aliases, namespace imports, default pages, and typed props', () => {
  for (const source of [
    `import { PageHeader } from '@/shared/ui/page-header'
     export default function InboxPage({ title }: { title: string }) {
       return <PageHeader title={title} description="Messages" badgeLabel={t('common.sample')} />
     }`,
    `import { PageHeader as Header } from '../../../shared/ui/page-header.tsx'
     export const InboxPage = ({ title }: Props) => <Header title={title} actions={<Button>New</Button>} />`,
    `import * as Headers from '/src/shared/ui/page-header'
     const InboxPage = () => <Headers.PageHeader title="Inbox" />
     export default InboxPage`,
    `import { PageHeader } from '@/shared/ui/page-header'
     import type { ComponentProps } from 'react'
     const props = { title: 'Inbox' } satisfies ComponentProps<typeof PageHeader>
     export default () => <PageHeader {...props} />`,
    `import { PageHeader } from '@/shared/ui/page-header'
     export default () => <PageHeader {...{ title: 'Inbox', description: 'Messages' }} />`,
  ]) {
    assert.deepEqual(rules('pages/inbox/ui/inbox-page.tsx', source), [])
  }
})

test('rejects PageHeader styling and unsupported props without banning action styles', () => {
  for (const attribute of [
    'className="text-3xl"',
    'size="lg"',
    'variant="hero"',
    'titleClassName="text-3xl"',
    'asChild',
    'children="Inbox"',
    '{...{ className: "text-3xl" }}',
    '{...({ ["className"]: "text-3xl" } as const)}',
    '{...{ title: "Inbox", ...{ size: "lg" } }}',
  ]) {
    assert.deepEqual(
      rules(
        'pages/inbox/ui/inbox-page.tsx',
        `import { PageHeader as Header } from '@/shared/ui/page-header'
         export default () => <Header title="Inbox" ${attribute} />`,
      ),
      ['page-header-props'],
      attribute,
    )
  }
  assert.deepEqual(
    rules(
      'pages/inbox/ui/inbox-page.tsx',
      `import { PageHeader } from '@/shared/ui/page-header'
       export default () => <PageHeader title="Inbox" style={{ fontSize: 32 }} />`,
    ),
    ['page-header-props', 'inline-style'],
  )
  assert.deepEqual(
    rules(
      'pages/inbox/ui/inbox-page.tsx',
      `import { PageHeader } from '@/shared/ui/page-header'
       export default () => <PageHeader key="inbox" title="Inbox" actions={<Button className="gap-2">New</Button>} />`,
    ),
    [],
  )
})

test('PageHeader accepts an empty JSX pair but does not allow children as another title API', () => {
  const importHeader = "import { PageHeader } from '@/shared/ui/page-header'"
  assert.deepEqual(
    rules(
      'pages/inbox/ui/inbox-page.tsx',
      `${importHeader}; export default () => <PageHeader title="Inbox"><span>Another title</span></PageHeader>`,
    ),
    ['page-header-props'],
  )
  assert.deepEqual(
    rules(
      'pages/inbox/ui/inbox-page.tsx',
      `${importHeader}; export default () => <PageHeader title="Inbox"> {/* comment */} </PageHeader>`,
    ),
    [],
  )
})

test('routes direct translated or literal Sample Badges through PageHeader', () => {
  for (const label of [
    "{t('common.sample')}",
    "{translate('admin:common.sample')}",
    'Sample',
    '{"샘플"}',
    "<span>{t('common.sample')}</span>",
    "{showSample && t('common.sample')}",
    "{showSample ? t('common.sample') : t('status.active')}",
  ]) {
    assert.deepEqual(
      rules(
        'pages/inbox/ui/intro.tsx',
        `import { Badge as Chip } from '@/shared/ui/badge'
         const Intro = () => <Chip variant="secondary">${label}</Chip>`,
      ),
      ['page-header-badge'],
      label,
    )
  }
  assert.deepEqual(
    rules(
      'pages/inbox/ui/intro.tsx',
      `import * as Chips from '../../../shared/ui/badge'
       const Intro = () => <Chips.Badge children={t('common.sample')} />`,
    ),
    ['page-header-badge'],
  )
})

test('retains status Badges, component examples, and Sample text outside direct shared Badge content', () => {
  assert.deepEqual(
    rules(
      'pages/inbox/ui/intro.tsx',
      `import { Badge } from '@/shared/ui/badge'
       const Intro = () => <>
         <Badge variant="secondary">{t('status.active')}</Badge>
         <Badge variant={status === 'Active' ? 'secondary' : 'outline'}>{status}</Badge>
         <Badge>{t('common.sample') === value ? 'Active' : 'Draft'}</Badge>
         <Badge aria-label={t('common.sample')}>Active</Badge>
         <p>{t('common.sample')}</p>
       </>`,
    ),
    [],
  )
  assert.deepEqual(
    rules(
      'pages/inbox/ui/intro.tsx',
      'const Badge = ({ children }: Props) => <span>{children}</span>; const Intro = () => <Badge>Sample</Badge>',
    ),
    [],
  )
})

test('rejects static ancestor selectors that override PageHeader title typography', () => {
  for (const className of [
    '"[&_h1]:text-3xl"',
    '"md:[&>h1]:leading-10"',
    '"[&_h1:hover]:tracking-wide"',
    '"[&_[data-slot=page-title]]:font-normal"',
    '"lg:[&_[data-slot=page-title]]:text-4xl"',
    'cn("gap-4", large && "lg:[&_h1]:text-4xl")',
    '"[&_h1]:[font-size:2rem]"',
  ]) {
    const issues = checkFile(
      'pages/inbox/ui/inbox-page.tsx',
      `import { PageHeader } from '@/shared/ui/page-header'
       export default () => <section className={${className}}><PageHeader title="Inbox" /></section>`,
    )
    assert.deepEqual(
      issues.map((issue) => issue.rule),
      ['page-header-style'],
      className,
    )
    assert.equal(issues[0].line, 2)
  }
})

test('retains surrounding page layout, section typography, and unrelated selector examples', () => {
  assert.deepEqual(
    rules(
      'pages/inbox/ui/inbox-page.tsx',
      `import { PageHeader } from '@/shared/ui/page-header'
       export default () => <VStack align="stretch" className="gap-6 text-sm [&_h2]:text-lg [&_h1+span]:text-xs [&_h1]:before:font-normal">
         <PageHeader title="Inbox" />
         <section className="[&_h1]:text-3xl"><h2>Messages</h2></section>
       </VStack>`,
    ),
    [],
  )
})
