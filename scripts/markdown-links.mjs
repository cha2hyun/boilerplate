export function proseOnly(markdown) {
  let fence
  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
      if (marker) {
        if (!fence) fence = marker
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined
        return ''
      }
      return fence ? '' : line.replace(/(`+).*?\1/g, '')
    })
    .join('\n')
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
