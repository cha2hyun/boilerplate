import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { staticUiValues } from './static-ui-values.mjs'

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
const testFilePattern = /(?:^|\/)(?:__tests__|__fixtures__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/
const classHelpers = new Set(['cn', 'clsx', 'classnames', 'classNames'])
const unknownClassFragment = '\0'
const otherElementVariants = new Set([
  '*',
  '**',
  'before',
  'after',
  'marker',
  'file',
  'selection',
  'placeholder',
  'first-letter',
  'first-line',
  'backdrop',
])
const pageHeaderProps = new Set(['title', 'description', 'badgeLabel', 'actions', 'key'])

// Follow values that can reach className, rather than arbitrary strings in conditions or callbacks.
function classStrings(node, values, seen = new Set()) {
  node = values.resolve(node)
  if (!node || seen.has(node)) return [unknownClassFragment]
  const next = new Set(seen).add(node)
  const read = (value) => classStrings(value, values, next)
  if (ts.isStringLiteralLike(node)) return [node.text]
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return read(node.expression)
  }
  if (ts.isConditionalExpression(node)) {
    return [...read(node.whenTrue), ...read(node.whenFalse)]
  }
  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return read(node.right)
    }
    if (
      [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(
        node.operatorToken.kind,
      )
    ) {
      return [...read(node.left), ...read(node.right)]
    }
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return read(node.left).flatMap((left) => read(node.right).map((right) => left + right))
    }
  }
  if (ts.isTemplateExpression(node)) {
    let values = [node.head.text]
    for (const span of node.templateSpans) {
      values = values.flatMap((value) =>
        read(span.expression).map((expression) => value + expression + span.literal.text),
      )
    }
    return values
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(read)
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap((property) => {
      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
        return []
      }
      if (ts.isComputedPropertyName(property.name)) return read(property.name.expression)
      return [property.name.text]
    })
  }
  if (ts.isCallExpression(node) && classHelpers.has(classHelperName(node.expression, values))) {
    return node.arguments.flatMap(read)
  }
  return [unknownClassFragment]
}

function variantTargetsElement(variant) {
  if (otherElementVariants.has(variant)) return false
  if (!variant.startsWith('[') || variant.startsWith('[@')) return true

  // In arbitrary selectors, the final compound must still select &, not a descendant or pseudo-element.
  let targetsElement = false
  let depth = 0
  for (let index = 1; index < variant.length - 1; index += 1) {
    const character = variant[index]
    if (character === '\\') index += 1
    else if (['[', '('].includes(character)) depth += 1
    else if ([']', ')'].includes(character)) depth -= 1
    else if (depth === 0) {
      if (character === '&') targetsElement = true
      else if (
        ['_', '>', '+', '~'].includes(character) ||
        (character === ':' && variant[index + 1] === ':')
      ) {
        targetsElement = false
      }
    }
  }
  return targetsElement
}

function classHelperName(node, values) {
  return (
    values.imported(node)?.name ??
    (ts.isIdentifier(node) && !values.binding(node) ? node.text : undefined)
  )
}

function classUtilities(node, values) {
  return classStrings(node, values).flatMap((value) =>
    value.split(/\s+/).map((token) => {
      let depth = 0
      let utilityStart = 0
      const variants = []
      for (let index = 0; index < token.length; index += 1) {
        if (['[', '('].includes(token[index])) depth += 1
        else if ([']', ')'].includes(token[index])) depth -= 1
        else if (token[index] === ':' && depth === 0) {
          variants.push(token.slice(utilityStart, index))
          utilityStart = index + 1
        }
      }
      return {
        name: token.slice(utilityStart).replace(/^!|!$/g, ''),
        variant: utilityStart > 0,
        variants,
        targetsElement: variants.every(variantTargetsElement),
      }
    }),
  )
}

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

function unwrapExpression(node) {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node))
  ) {
    node = node.expression
  }
  return node
}

function isSampleLabel(node) {
  node = unwrapExpression(node)
  if (!node) return false
  if (ts.isJsxExpression(node)) return isSampleLabel(node.expression)
  if (ts.isJsxText(node) || ts.isStringLiteralLike(node)) {
    return ['Sample', '샘플'].includes(node.text.trim())
  }
  if (ts.isJsxElement(node)) return node.children.some(isSampleLabel)
  if (ts.isConditionalExpression(node)) {
    return isSampleLabel(node.whenTrue) || isSampleLabel(node.whenFalse)
  }
  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return isSampleLabel(node.right)
    }
    if (
      [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(
        node.operatorToken.kind,
      )
    ) {
      return isSampleLabel(node.left) || isSampleLabel(node.right)
    }
  }
  return (
    ts.isCallExpression(node) &&
    node.arguments[0] &&
    ts.isStringLiteralLike(node.arguments[0]) &&
    ['common.sample', 'admin:common.sample'].includes(node.arguments[0].text)
  )
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
  const isTest = testFilePattern.test(file)
  const isPage = sourceLayer === 'pages' && !isTest
  const values = staticUiValues(source)
  const importedComponent = (node, module, name) => {
    const imported = values.imported(node)
    return (
      imported?.name === name &&
      internalPath(imported.module, file)?.replace(/\.[cm]?[jt]sx?$/, '') === module
    )
  }
  const jsxAttributeValue = (node, name) =>
    values.resolve(values.attributes(node).find((attribute) => attribute.name === name)?.value)
  const checkedClasses = new Set()
  function inspectClasses(node, reportNode = node) {
    node = values.resolve(node)
    if (!node || checkedClasses.has(node)) return
    checkedClasses.add(node)
    const strings = classStrings(node, values)
    if (
      strings.some(
        (value) =>
          paletteUtility.test(value) ||
          literalColorUtility.test(value) ||
          (!isUi && fixedNeutralUtility.test(value)),
      )
    ) {
      report(
        'design-token',
        '고정 색상 대신 bg-background, text-muted-foreground 등 shadcn 의미 토큰을 사용하세요.',
        location(source, reportNode),
      )
    }
    if (strings.some((value) => unsupportedWeightUtility.test(value))) {
      report(
        'font-weight',
        '폰트 두께는 font-normal(400), font-medium(500), font-semibold(600)만 사용하세요.',
        location(source, reportNode),
      )
    }
  }
  const checkedColors = new Set()
  function inspectColor(node, reportNode = node) {
    node = values.resolve(node)
    if (!node || checkedColors.has(node)) return
    checkedColors.add(node)
    if (classStrings(node, values).some((value) => fixedColorValue.test(value))) {
      report(
        'design-token',
        '차트와 SVG 색상에도 의미 토큰을 사용하세요.',
        location(source, reportNode),
      )
    }
  }
  function inspectColorObject(node, seen = new Set()) {
    node = values.resolve(node)
    if (!node || seen.has(node)) return
    const next = new Set(seen).add(node)
    for (const field of values.properties(node).values()) {
      if (colorProperties.has(field.name)) inspectColor(field.value, field.node)
      else inspectColorObject(field.value, next)
    }
  }
  let usesPageHeader = false
  const checkedHeaderAncestors = new Set()
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
      (ts.isSatisfiesExpression(node) || ts.isVariableDeclaration(node)) &&
      node.type &&
      ts.isTypeReferenceNode(node.type) &&
      node.type.typeName.getText(source) === 'ChartConfig'
    ) {
      inspectColorObject(ts.isSatisfiesExpression(node) ? node.expression : node.initializer)
    }
    if (
      file !== 'shared/lib/format.ts' &&
      !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) &&
      (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const member = node.expression
      const directNumberFormat =
        ts.isIdentifier(member.expression) &&
        member.expression.text === 'Intl' &&
        member.name.text === 'NumberFormat'
      if (directNumberFormat || ['toFixed', 'toPrecision'].includes(member.name.text)) {
        report(
          'number-format',
          '숫자 표시는 shared/lib/format의 formatNumber를 사용하세요. 숫자 계약은 docs/number-formatting.md를 참고하세요.',
          location(source, node),
        )
      }
    }
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
      const helper = classHelperName(node.expression, values)
      if (classHelpers.has(helper)) inspectClasses(node)
      if (helper === 'cva') {
        inspectClasses(node.arguments[0])
        const options = values.properties(node.arguments[1])
        for (const variant of values.properties(options.get('variants')?.value).values()) {
          for (const choice of values.properties(variant.value).values()) {
            inspectClasses(choice.value, choice.node)
          }
        }
        const compounds = values.resolve(options.get('compoundVariants')?.value)
        if (compounds && ts.isArrayLiteralExpression(compounds)) {
          for (const compound of compounds.elements) {
            for (const field of values.properties(compound).values()) {
              if (['class', 'className'].includes(field.name))
                inspectClasses(field.value, field.node)
            }
          }
        }
      }
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
      const tags = /^[a-z][\w-]*$/.test(tag) ? [tag] : classStrings(node.tagName, values)
      const pageHeader = importedComponent(node.tagName, 'shared/ui/page-header', 'PageHeader')
      if (isPage) {
        const role = jsxAttributeValue(node, 'role')
        const level = jsxAttributeValue(node, 'aria-level')
        if (
          tags.includes('h1') ||
          (role &&
            ts.isStringLiteralLike(role) &&
            role.text === 'heading' &&
            level &&
            (ts.isStringLiteralLike(level) || ts.isNumericLiteral(level)) &&
            level.text === '1')
        ) {
          report(
            'page-header',
            '페이지 h1은 shared/ui/page-header의 PageHeader가 소유합니다. 직접 제목을 만들지 마세요.',
            location(source, node),
          )
        }
        if (
          importedComponent(node.tagName, 'shared/ui/badge', 'Badge') &&
          (isSampleLabel(jsxAttributeValue(node, 'children')) ||
            (ts.isJsxOpeningElement(node) && node.parent.children.some(isSampleLabel)))
        ) {
          report(
            'page-header-badge',
            "Sample 표시는 별도 Badge 대신 PageHeader의 badgeLabel={t('common.sample')}로 전달하세요.",
            location(source, node),
          )
        }
      }
      if (!isTest && pageHeader) {
        usesPageHeader = true
        if (
          ts.isJsxOpeningElement(node) &&
          node.parent.children.some(
            (child) =>
              (ts.isJsxText(child) && child.text.trim()) ||
              (ts.isJsxExpression(child) ? child.expression : !ts.isJsxText(child)),
          )
        ) {
          report(
            'page-header-props',
            'PageHeader 제목·설명은 문자열 props로 전달하고 컨트롤은 actions로 전달하세요. children은 지원하지 않습니다.',
            location(source, node),
          )
        }
        for (const attribute of values.attributes(node)) {
          if (!pageHeaderProps.has(attribute.name)) {
            report(
              'page-header-props',
              'PageHeader는 title·description·badgeLabel·actions만 받습니다. 제목 스타일·children·variant를 페이지에서 덮어쓰지 마세요.',
              location(source, attribute.node),
            )
          }
        }
        for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
          if (
            !ts.isJsxElement(ancestor) ||
            ancestor.openingElement === node ||
            checkedHeaderAncestors.has(ancestor)
          ) {
            continue
          }
          checkedHeaderAncestors.add(ancestor)
          const className = jsxAttributeValue(ancestor.openingElement, 'className')
          if (
            className &&
            classUtilities(className, values).some(
              ({ name, variants }) =>
                /^(?:text-|font-|leading-|tracking-|\[(?:font|line-height|letter-spacing))/.test(
                  name,
                ) &&
                !variants.some((variant) => ['before', 'after', 'marker'].includes(variant)) &&
                variants.some(
                  (variant) =>
                    variant.startsWith('[') &&
                    /[\s_>]h1(?:[:.#][^>_+~\]]*)?\]$|data-slot=['"]?page-title['"]?\](?:[:.#][^>_+~\]]*)?\]$/.test(
                      variant,
                    ),
                ),
            )
          ) {
            report(
              'page-header-style',
              '부모 선택자로 PageHeader의 h1 타이포그래피를 덮어쓰지 마세요. 공통 page-header.tsx에서 관리하세요.',
              location(source, ancestor.openingElement),
            )
          }
        }
      }
      if (!isUi && tags.some((name) => nativeControls.has(name))) {
        report(
          'shadcn-control',
          `<${tag}> 대신 shared/ui의 shadcn 컴포넌트를 사용하세요.`,
          location(source, node),
        )
      }
      if (!isUi && tags.includes('style'))
        report('custom-css', '<style> 대신 Tailwind 유틸리티를 사용하세요.', location(source, node))
      for (const attribute of values.attributes(node)) {
        const value = values.resolve(attribute.value)
        if (attribute.name === 'className') inspectClasses(attribute.value, attribute.node)
        if (['config', 'style'].includes(attribute.name)) inspectColorObject(attribute.value)
        if (!isUi && !isTest && attribute.name === 'className') {
          const utilities = classUtilities(value, values)
          if (
            tags.includes('div') &&
            utilities.some(
              ({ name, targetsElement }) =>
                targetsElement &&
                (['flex', 'inline-flex', '[display:flex]', '[display:inline-flex]'].includes(
                  name,
                ) ||
                  /^-?space-[xy]-/.test(name)),
            )
          ) {
            report(
              'stack-layout',
              '행·열 레이아웃의 div에는 shared/ui/stack의 HStack 또는 VStack과 gap을 사용하세요. grid는 그대로 사용할 수 있습니다.',
              location(source, attribute.node),
            )
          }
          if (
            ['HStack', 'VStack'].includes(tag) &&
            utilities.some(
              ({ name, variant }) =>
                !variant &&
                (/^(?:items|justify)-/.test(name) || /^flex-(?:row|col)(?:-reverse)?$/.test(name)),
            )
          ) {
            report(
              'stack-props',
              'Stack의 기본 정렬은 align·justify prop으로, 방향은 HStack·VStack으로 지정하세요. 반응형 클래스는 허용합니다.',
              location(source, attribute.node),
            )
          }
        }
        if (colorProperties.has(attribute.name)) inspectColor(attribute.value, attribute.node)
        if (!isUi && attribute.name === 'style') {
          report(
            'inline-style',
            'inline style 대신 Tailwind 유틸리티를 사용하세요.',
            location(source, attribute.node),
          )
        }
        if (
          !isUi &&
          tags.some((name) => /^[a-z]/.test(name)) &&
          attribute.name === 'role' &&
          value &&
          ts.isStringLiteralLike(value) &&
          controlRoles.has(value.text)
        ) {
          report(
            'shadcn-control',
            '직접 만든 ARIA 컨트롤 대신 shadcn 컴포넌트를 사용하세요.',
            location(source, attribute.node),
          )
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  if (isPage && /(?:^|\/)[^/]+-page\.tsx$/.test(file) && !usesPageHeader) {
    report(
      'page-header-required',
      '페이지 진입점은 shared/ui/page-header에서 PageHeader를 value import하여 JSX로 사용하세요.',
    )
  }
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
      'Architecture guardrails passed: FSD boundaries, shadcn controls, page headers, Tailwind styles, and design tokens.',
    )
  }
}
