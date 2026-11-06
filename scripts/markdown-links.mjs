function outsideFences(markdown) {
  let fence
  return markdown.split(/\r?\n/).map((line) => {
    const marker = /^\s*(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = undefined
      return ''
    }
    if (marker) {
      fence = marker[1]
      return ''
    }
    return line
  })
}

const inlineCode = /(?<!`)(`+)(?!`)([^\n]*?)(?<!`)\1(?!`)/g

export function proseOnly(markdown) {
  return outsideFences(markdown).join('\n').replace(inlineCode, '')
}

// GitHub section links use rendered heading text. Code contributes its literal
// text, while link destinations and emphasis markers in prose do not.
function headingText(title) {
  const code = []
  return title
    .replace(inlineCode, (_, delimiter, value) => {
      const index = code.push(
        value.trim() && value.startsWith(' ') && value.endsWith(' ') ? value.slice(1, -1) : value,
      )
      return `\0${index - 1}\0`
    })
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(?<![\p{L}\p{N}_])(_{1,2})(?=\S)(.+?)\1(?![\p{L}\p{N}_])/gu, '$2')
    .replace(/\0(\d+)\0/g, (_, index) => code[index])
}

export function markdownHeadingAnchors(markdown) {
  const anchors = new Set()
  for (const line of outsideFences(markdown)) {
    const heading = /^ {0,3}#{1,6}[ \t]+(.+)$/.exec(line)
    if (!heading) continue
    const title = heading[1].replace(/[ \t]+#+[ \t]*$/, '').trim()
    const base = headingText(title)
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}_ -]/gu, '')
      .replaceAll(' ', '-')
    let anchor = base
    for (let suffix = 1; anchors.has(anchor); suffix++) anchor = `${base}-${suffix}`
    anchors.add(anchor)
  }
  return anchors
}

// This authoring format uses inline links, not a full Markdown parser.
// Balanced/escaped parentheses and angle-wrapped destinations are supported.
export function inlineLinks(prose, file, issues) {
  const links = []
  const opening = /(?<!\\)\[(?:\\.|[^\]\\\n])*\]\(/g
  for (const match of prose.matchAll(opening)) {
    let cursor = match.index + match[0].length
    while (/\s/.test(prose[cursor] ?? '') && cursor < prose.length) cursor++
    const angle = prose[cursor] === '<'
    if (angle) cursor++
    let target = ''
    let depth = 0
    let closed = false
    for (; cursor < prose.length; cursor++) {
      const character = prose[cursor]
      if (character === '\\' && cursor + 1 < prose.length) {
        target += character + prose[++cursor]
      } else if (angle && character === '>') {
        cursor++
        while (/\s/.test(prose[cursor] ?? '') && cursor < prose.length) cursor++
        closed = prose[cursor] === ')'
        break
      } else if (!angle && character === '(') {
        depth++
        target += character
      } else if (!angle && character === ')') {
        if (depth === 0) {
          closed = true
          break
        }
        depth--
        target += character
      } else if (character === '\n' || (!angle && /\s/.test(character))) {
        break
      } else {
        target += character
      }
    }
    if (!closed || !target) {
      issues.push(`${file}: malformed inline link; use [label](relative/path) or <space path>.`)
    } else {
      links.push({ target, index: match.index })
    }
  }
  return links
}
