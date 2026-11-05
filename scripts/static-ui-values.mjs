import ts from 'typescript'

function unwrap(node) {
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

/** File-local syntax analysis only: never execute code or guess values from mutable bindings. */
export function staticUiValues(source) {
  const scopes = new WeakMap()
  const root = { parent: null, function: true, bindings: new Map() }
  const invalidated = new Set()

  function bind(name, scope, declaration, initializer) {
    if (ts.isIdentifier(name)) {
      scope.bindings.set(name.text, { declaration, initializer })
    } else {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) bind(element.name, scope, element)
      }
    }
  }

  function collect(node, outer) {
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      bind(node.name, outer, node)
    }
    let scope = outer
    if (ts.isFunctionLike(node)) {
      scope = { parent: outer, function: true, bindings: new Map() }
      if (ts.isFunctionExpression(node) && node.name) bind(node.name, scope, node)
    } else if (ts.isClassLike(node)) {
      scope = { parent: outer, function: false, bindings: new Map() }
      if (node.name) bind(node.name, scope, node)
    } else if (
      ts.isBlock(node) ||
      ts.isCatchClause(node) ||
      ts.isCaseBlock(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node)
    ) {
      scope = { parent: outer, function: false, bindings: new Map() }
    }
    scopes.set(node, scope)
    if (ts.isVariableDeclaration(node)) {
      const list = ts.isVariableDeclarationList(node.parent) ? node.parent : undefined
      let owner = scope
      if (list && !(list.flags & ts.NodeFlags.BlockScoped)) {
        while (!owner.function) owner = owner.parent
      }
      bind(
        node.name,
        owner,
        node,
        list && list.flags & ts.NodeFlags.Const ? node.initializer : undefined,
      )
    } else if (ts.isParameter(node)) {
      bind(node.name, scope, node)
    } else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) {
      bind(node.name, scope, node)
    } else if (ts.isImportClause(node) && node.name) {
      bind(node.name, scope, node)
    }
    ts.forEachChild(node, (child) => collect(child, scope))
  }
  collect(source, root)

  function binding(node) {
    if (!node || !ts.isIdentifier(node)) return undefined
    for (let scope = scopes.get(node); scope; scope = scope.parent) {
      const found = scope.bindings.get(node.text)
      if (found) return found
    }
    return undefined
  }

  // A const object can still be mutated. Visible writes invalidate its static initializer.
  function invalidateWrite(node) {
    node = unwrap(node)
    while (node && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) {
      node = unwrap(node.expression)
    }
    let found = binding(node)
    const seen = new Set()
    while (found && !seen.has(found.declaration)) {
      seen.add(found.declaration)
      invalidated.add(found.declaration)
      // A visible write through a const alias also changes the original object.
      found = binding(unwrap(found.initializer))
    }
  }
  function writes(node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      invalidateWrite(node.left)
    } else if (
      ts.isDeleteExpression(node) ||
      ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator))
    ) {
      invalidateWrite(ts.isDeleteExpression(node) ? node.expression : node.operand)
    }
    ts.forEachChild(node, writes)
  }
  writes(source)

  function resolve(node, seen = new Set()) {
    node = unwrap(node)
    if (!node || seen.has(node)) return undefined
    const next = new Set(seen).add(node)
    if (ts.isIdentifier(node)) {
      const found = binding(node)
      if (found?.initializer && !invalidated.has(found.declaration)) {
        return resolve(found.initializer, next)
      }
    } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const key = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : propertyName(node.argumentExpression, next)
      if (key !== undefined) {
        const field = properties(node.expression, next).get(key)
        if (field) return resolve(field.value, next)
      }
    }
    return node
  }

  function propertyName(node, seen = new Set()) {
    node = resolve(node, seen)
    return node && (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node))
      ? node.text
      : undefined
  }

  function properties(node, seen = new Set()) {
    node = resolve(node, seen)
    if (!node || !ts.isObjectLiteralExpression(node) || seen.has(node)) return new Map()
    const next = new Set(seen).add(node)
    const result = new Map()
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        for (const [key, field] of properties(property.expression, next)) result.set(key, field)
        continue
      }
      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
        continue
      }
      const key = ts.isComputedPropertyName(property.name)
        ? propertyName(property.name.expression, next)
        : property.name.text
      if (key !== undefined) {
        result.set(key, {
          name: key,
          value: ts.isPropertyAssignment(property) ? property.initializer : property.name,
          node: property,
        })
      }
    }
    return result
  }

  function attributes(node) {
    const result = new Map()
    for (const attribute of node.attributes.properties) {
      if (ts.isJsxSpreadAttribute(attribute)) {
        for (const [key, field] of properties(attribute.expression)) result.set(key, field)
      } else {
        const initializer = attribute.initializer
        const name = attribute.name.getText(source)
        result.set(name, {
          name,
          value:
            initializer && ts.isJsxExpression(initializer) ? initializer.expression : initializer,
          node: attribute,
        })
      }
    }
    return [...result.values()]
  }

  function imported(node) {
    node = resolve(node)
    let member
    if (node && ts.isPropertyAccessExpression(node)) {
      member = node.name.text
      node = resolve(node.expression)
    }
    const declaration = binding(node)?.declaration
    if (!declaration) return undefined
    let importDeclaration = declaration
    while (importDeclaration && !ts.isImportDeclaration(importDeclaration)) {
      importDeclaration = importDeclaration.parent
    }
    if (!importDeclaration || importDeclaration.importClause?.isTypeOnly) return undefined
    if (ts.isImportSpecifier(declaration) && !declaration.isTypeOnly && !member) {
      return {
        module: importDeclaration.moduleSpecifier.text,
        name: (declaration.propertyName ?? declaration.name).text,
      }
    }
    if (ts.isNamespaceImport(declaration) && member) {
      return { module: importDeclaration.moduleSpecifier.text, name: member }
    }
    return undefined
  }

  return { resolve, binding, properties, attributes, imported }
}
