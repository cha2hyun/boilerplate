import path from 'node:path'
import ts from 'typescript'

// This is an exact public API exception, not permission to expose arbitrary slice files.
export const searchEntrypoints = new Set([
  'pages/overview/search.ts',
  'pages/projects/search.ts',
  'pages/analytics/search.ts',
  'pages/orders/search.ts',
  'pages/customers/search.ts',
  'pages/inbox/search.ts',
  'pages/users/search.ts',
  'widgets/project-table/search.ts',
  'widgets/revenue-chart/search.ts',
])

export function isSearchEntrypoint(target) {
  return searchEntrypoints.has(target.endsWith('.ts') ? target : `${target}.ts`)
}

function parse(file, source) {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

export function checkSearchEntrypoint(file, contents) {
  if (!searchEntrypoints.has(file)) return []
  const source = parse(file, contents)
  const invalid = source.statements.find(
    (node) =>
      !ts.isExportDeclaration(node) ||
      !node.moduleSpecifier ||
      !ts.isStringLiteralLike(node.moduleSpecifier) ||
      !node.exportClause ||
      !ts.isNamedExports(node.exportClause) ||
      node.exportClause.elements.length === 0 ||
      node.exportClause.elements.some(
        (item) => item.name.text === 'default' || item.propertyName?.text === 'default',
      ),
  )
  if (!invalid && source.statements.length > 0) return []
  return [
    {
      file,
      line: invalid ? source.getLineAndCharacterOfPosition(invalid.getStart(source)).line + 1 : 1,
      rule: 'search-entry-export',
      message: '공개 search.ts는 기존 조회 계약의 named re-export만 허용합니다.',
    },
  ]
}

const componentLibraries =
  /^(?:react(?:-dom|-i18next)?|recharts|radix-ui|@radix-ui\/[^/]+|@base-ui\/[^/]+|cmdk|lucide-react|react-day-picker|sonner|@mui\/[^/]+|antd|@chakra-ui\/[^/]+|@mantine\/[^/]+)(?:\/|$)/
const uiModule =
  /(?:^|\/)(?:ui|components)(?:\/|$)|\.[cm]?[jt]sx$|\.(?:css|scss|sass|less|styl)(?:\?|$)/

function runtimeImports(file, contents) {
  const source = parse(file, contents)
  const imports = []
  const add = (node, specifier, sideEffect = false) => {
    imports.push({
      specifier,
      sideEffect,
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    })
  }
  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause
      if (clause?.isTypeOnly) return
      const named = clause?.namedBindings
      // With verbatimModuleSyntax, `import { type T }` becomes `import {}`.
      // Only a declaration-level `import type` removes the runtime edge entirely.
      add(
        node,
        node.moduleSpecifier.text,
        !clause ||
          (!clause.name &&
            named &&
            ts.isNamedImports(named) &&
            named.elements.every((item) => item.isTypeOnly)),
      )
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (node.isTypeOnly) return
      // Vite/Oxc erases a re-export containing only type specifiers (unlike imports).
      if (
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((item) => item.isTypeOnly)
      )
        return
      add(
        node,
        node.moduleSpecifier.text,
        node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.exportClause.elements.length === 0,
      )
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node, node.moduleReference.expression?.text)
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      const value = node.arguments[0]
      add(node, value && ts.isStringLiteralLike(value) ? value.text : undefined)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return imports
}

function internalTarget(specifier, file) {
  const clean = specifier.split(/[?#]/, 1)[0]
  if (clean.startsWith('@/')) return path.posix.normalize(clean.slice(2))
  if (clean.startsWith('/src/')) return path.posix.normalize(clean.slice(5))
  if (clean.startsWith('.'))
    return path.posix.normalize(path.posix.join(path.posix.dirname(file), clean))
  return null
}

/** Follow source runtime edges, including barrels; type-only edges have no bundle cost. */
export function checkSearchRuntimeGraph(sources) {
  const imports = new Map()
  const issues = []
  for (const entry of searchEntrypoints) {
    if (!sources.has(entry)) continue
    const seen = new Set()
    function walk(file, chain) {
      if (seen.has(file)) return
      seen.add(file)
      if (!imports.has(file)) imports.set(file, runtimeImports(file, sources.get(file)))
      for (const edge of imports.get(file)) {
        const report = (reason) =>
          issues.push({
            file,
            line: edge.line,
            rule: 'search-entry-runtime',
            message: `${entry}의 런타임 조회 계약에 ${reason} 연결할 수 없습니다. 경로: ${[...chain, edge.specifier ?? '(computed import)'].join(' → ')}`,
          })
        if (!edge.specifier || edge.sideEffect) {
          report(edge.sideEffect ? 'side-effect-only import를' : '계산된 import를')
          continue
        }
        const target = internalTarget(edge.specifier, file)
        if (componentLibraries.test(edge.specifier) || uiModule.test(target ?? edge.specifier)) {
          report('UI/컴포넌트 모듈을')
          continue
        }
        if (target === null) continue
        const resolved = [
          target,
          ...['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '/index.ts', '/index.tsx'].map(
            (extension) => `${target}${extension}`,
          ),
        ].find((candidate) => sources.has(candidate))
        if (!resolved) {
          report('해석할 수 없는 내부 모듈을')
        } else if (uiModule.test(resolved)) {
          report('UI/컴포넌트 모듈을')
        } else {
          walk(resolved, [...chain, resolved])
        }
      }
    }
    walk(entry, [entry])
  }
  return issues
}
