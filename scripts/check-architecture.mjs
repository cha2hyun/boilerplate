import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']
const sourceEntrypoints = new Set(['main.tsx', 'test/setup.ts'])
const sourcePattern = /\.[cm]?[jt]sx?$/
const stylesheetPattern = /\.(?:css|scss|sass|less|styl)(?:\?|$)/
const nativeControls = new Set([
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'dialog',
  'progress',
  'meter',
])
const controlRoles = new Set([
  'button',
  'checkbox',
  'combobox',
  'listbox',
  'menuitem',
  'radio',
  'slider',
  'switch',
  'tab',
])
const unsupportedLibraries =
  /^(?:styled-components|@emotion\/|@stitches\/|@linaria\/|goober(?:\/|$)|jss(?:\/|$)|@mui\/|antd(?:\/|$)|@chakra-ui\/|@mantine\/)/
const primitives = /^(?:@radix-ui\/|radix-ui(?:\/|$)|@base-ui\/)/
const paletteUtility =
  /(?:^|[\s:])(?:bg|text|border|ring|outline|fill|stroke|shadow|accent|caret|decoration|divide|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)(?:\b|\/)/
const literalColorUtility =
  /(?:bg|text|border|ring|outline|fill|stroke|shadow|accent|caret|decoration|divide|from|via|to)-\[(?:#|(?:rgb|hsl|oklch|oklab|lab|lch|color)\()/
const fixedNeutralUtility =
  /(?:^|[\s:!])(?:bg|text|border|ring|outline|fill|stroke|shadow|accent|caret|decoration|divide|from|via|to)-(?:black|white)(?:$|[\s/!])/
const unsupportedWeightUtility =
  /(?:^|[\s:!])font-(?:thin|extralight|light|bold|extrabold|black)(?:$|[\s!])|font-(?:\[[^\]]*|\([^)]*)|\[(?:font-weight|font-variation-settings):/
const colorProperties = new Set([
  'color',
  'fill',
  'stroke',
  'stopColor',
  'backgroundColor',
  'borderColor',
])
const fixedColorValue =
  /^(?:#|(?:rgb|hsl|oklch|oklab|lab|lch|color)\(|(?:black|white|red|blue|green|yellow|orange|purple|gray|grey)$)/i
const normalize = (value) => value.split(path.sep).join('/')

function internalPath(specifier, importer) {
  const clean = specifier.split(/[?#]/, 1)[0]
  if (clean.startsWith('@/')) return path.posix.normalize(clean.slice(2))
  if (clean.startsWith('/src/')) return path.posix.normalize(clean.slice(5))
  if (clean.startsWith('.')) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(importer), clean))
  }
  return null
}

function location(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
}

/** Pure entry point used by the guardrail regression tests. Paths are relative to src/. */
export function checkFile(filename, contents) {
  const file = normalize(filename)
  const issues = []
  const report = (rule, message, line = 1) =>
    issues.push({ file: `src/${file}`, line, rule, message })

  if (stylesheetPattern.test(file)) {
    if (file !== 'app/styles/globals.css') {
      report(
        'stylesheet',
        'CSS 파일은 src/app/styles/globals.css 하나만 허용합니다. Tailwind 유틸리티를 사용하세요.',
      )
    } else {
      // The single stylesheet is the shadcn token/Tailwind entrypoint, not a component stylesheet.
      const allowed = new Set([
        ':root',
        '.dark',
        '@theme inline',
        '@theme',
        '@layer base',
        '*',
        'html',
        'body',
        'b, strong',
      ])
      const withoutComments = contents.replace(/\/\*[\s\S]*?\*\//g, '')
      for (const match of withoutComments.matchAll(/([^{}]+)\{/g)) {
        const selector = match[1].split(';').at(-1).trim().replace(/\s+/g, ' ')
        if (!allowed.has(selector)) {
          report(
            'custom-css',
            `사용자 정의 CSS 선택자 "${selector}"는 허용하지 않습니다. Tailwind 또는 shadcn 토큰을 사용하세요.`,
          )
        }
      }
      for (const match of withoutComments.matchAll(/--font-weight-([\w*]+)\s*:\s*([^;}]+)/g)) {
        const approved = { '*': 'initial', normal: '400', medium: '500', semibold: '600' }
        if (approved[match[1]] !== match[2].trim()) {
          report(
            'font-weight',
            '폰트 두께 토큰은 normal(400), medium(500), semibold(600)만 허용합니다.',
          )
        }
      }
      if (unsupportedWeightUtility.test(withoutComments)) {
        report('font-weight', 'font-normal, font-medium, font-semibold만 사용하세요.')
      }
    }
    return issues
  }

  if (!sourcePattern.test(file)) return issues

  const source = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const [sourceLayer, sourceSlice] = file.split('/')
  const sourceLevel = layers.indexOf(sourceLayer)
  const isUi = file.startsWith('shared/ui/')
  if (sourceLevel < 0 && !sourceEntrypoints.has(file)) {
    report('unknown-layer', '앱 코드는 app/pages/widgets/features/entities/shared 레이어에 두세요.')
  }

  function inspectImport(specifier, node) {
    const line = location(source, node)
    if (unsupportedLibraries.test(specifier)) {
      report(
        'ui-library',
        `"${specifier}" 대신 Tailwind와 shared/ui의 shadcn 컴포넌트를 사용하세요.`,
        line,
      )
    }
    if (!isUi && primitives.test(specifier)) {
      report(
        'ui-primitive',
        'Radix/Base UI primitive는 shared/ui의 shadcn 컴포넌트에서만 가져오세요.',
        line,
      )
    }

    const target = internalPath(specifier, file)
    if (stylesheetPattern.test(specifier) && target !== 'app/styles/globals.css') {
      report('stylesheet-import', '스타일시트 import는 app/styles/globals.css만 허용합니다.', line)
    }
    if (target === null) return
    if (target.startsWith('../')) {
      report('outside-src', 'src 밖의 코드를 앱에서 가져올 수 없습니다.', line)
      return
    }

    const [targetLayer, targetSlice, ...targetRest] = target.split('/')
    const targetLevel = layers.indexOf(targetLayer)
    if (targetLevel < 0) {
      report(
        'unknown-layer',
        '등록된 레이어의 코드만 가져오세요. 앱 진입점과 테스트 setup은 import 대상이 아닙니다.',
        line,
      )
      return
    }
    if (sourceLevel < 0) return

    if (targetLevel < sourceLevel) {
      report(
        'layer-direction',
        `${sourceLayer}에서 상위 레이어 ${targetLayer}를 가져올 수 없습니다.`,
        line,
      )
      return
    }
    if (targetLayer === sourceLayer) {
      if (['app', 'shared'].includes(sourceLayer) || targetSlice === sourceSlice) return
      report(
        'slice-isolation',
        `${sourceLayer}/${sourceSlice}에서 같은 레이어의 ${targetSlice} 슬라이스를 가져올 수 없습니다. 상위 레이어에서 조합하세요.`,
        line,
      )
      return
    }

    if (['app', 'shared'].includes(targetLayer)) return
    const isPublicEntry =
      targetSlice &&
      (targetRest.length === 0 ||
        (targetRest.length === 1 && /^index(?:\.[cm]?[jt]sx?)?$/.test(targetRest[0])))
    if (!isPublicEntry) {
      report(
        'public-api',
        `${targetLayer}/${targetSlice ?? ''}의 내부 파일 대신 슬라이스 index.ts 공개 API를 가져오세요.`,
        line,
      )
    }
  }

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      inspectImport(node.moduleSpecifier.text, node)
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      inspectImport(node.moduleReference.expression.text, node)
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      inspectImport(node.argument.literal.text, node)
    }
    if (ts.isCallExpression(node)) {
      const isModuleCall =
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')
      if (isModuleCall) {
        const argument = node.arguments[0]
        if (argument && ts.isStringLiteralLike(argument)) inspectImport(argument.text, node)
        else
          report(
            'dynamic-import',
            '정적으로 검증 가능한 문자열 import 경로를 사용하세요.',
            location(source, node),
          )
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.kind === ts.SyntaxKind.MetaProperty &&
        ['glob', 'globEager'].includes(node.expression.name.text)
      ) {
        report(
          'dynamic-import',
          'import.meta.glob 대신 명시적 import로 레이어 경계를 유지하세요.',
          location(source, node),
        )
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source)
      if (!isUi && nativeControls.has(tag)) {
        report(
          'shadcn-control',
          `<${tag}> 대신 shared/ui의 shadcn 컴포넌트를 사용하세요.`,
          location(source, node),
        )
      }
      if (!isUi && tag === 'style')
        report('custom-css', '<style> 대신 Tailwind 유틸리티를 사용하세요.', location(source, node))
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue
        const value =
          attribute.initializer && ts.isJsxExpression(attribute.initializer)
            ? attribute.initializer.expression
            : attribute.initializer
        if (colorProperties.has(attribute.name.getText(source)) && attribute.initializer) {
          if (value && ts.isStringLiteralLike(value) && fixedColorValue.test(value.text)) {
            report(
              'design-token',
              '색상 속성에도 var(--brand), var(--foreground) 등 의미 토큰을 사용하세요.',
              location(source, attribute),
            )
          }
        }
        if (!isUi && attribute.name.getText(source) === 'style') {
          report(
            'inline-style',
            'inline style 대신 Tailwind 유틸리티를 사용하세요.',
            location(source, attribute),
          )
        }
        if (
          !isUi &&
          /^[a-z]/.test(tag) &&
          attribute.name.getText(source) === 'role' &&
          value &&
          ts.isStringLiteralLike(value) &&
          controlRoles.has(value.text)
        ) {
          report(
            'shadcn-control',
            '직접 만든 ARIA 컨트롤 대신 shadcn 컴포넌트를 사용하세요.',
            location(source, attribute),
          )
        }
      }
    }
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      if (
        paletteUtility.test(node.text) ||
        literalColorUtility.test(node.text) ||
        (!isUi && fixedNeutralUtility.test(node.text))
      ) {
        report(
          'design-token',
          '고정 색상 대신 bg-background, text-muted-foreground 등 shadcn 의미 토큰을 사용하세요.',
          location(source, node),
        )
      }
      if (unsupportedWeightUtility.test(node.text)) {
        report(
          'font-weight',
          '폰트 두께는 font-normal(400), font-medium(500), font-semibold(600)만 사용하세요.',
          location(source, node),
        )
      }
    }
    if (
      ts.isPropertyAssignment(node) &&
      colorProperties.has(node.name.getText(source)) &&
      ts.isStringLiteralLike(node.initializer) &&
      fixedColorValue.test(node.initializer.text)
    ) {
      report('design-token', '차트 설정의 색상에도 의미 토큰을 사용하세요.', location(source, node))
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return issues
}

export async function checkArchitecture(root = process.cwd()) {
  const sourceDirectory = path.join(root, 'src')
  const files = await readdir(sourceDirectory, { recursive: true, withFileTypes: true })
  const sourceFiles = files
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
  const results = await Promise.all(
    sourceFiles.map(async (filename) =>
      checkFile(path.relative(sourceDirectory, filename), await readFile(filename, 'utf8')),
    ),
  )
  return results.flat()
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = await checkArchitecture()
  if (issues.length) {
    for (const issue of issues)
      console.error(`${issue.file}:${issue.line} [${issue.rule}] ${issue.message}`)
    process.exitCode = 1
  } else {
    console.log(
      'Architecture guardrails passed: FSD boundaries, shadcn controls, Tailwind styles, and design tokens.',
    )
  }
}
