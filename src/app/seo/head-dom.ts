import type { HeadTag } from './metadata'

/** Reuse ownership of the generated head without touching icons, fonts, or script tags. */
export function updateDocumentHead(tags: HeadTag[]) {
  const fragment = document.createDocumentFragment()
  for (const { tag, attributes, text } of tags) {
    const element = document.createElement(tag)
    element.setAttribute('data-page-meta', '')
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value)
    if (text !== undefined) element.textContent = text
    fragment.append(element)
  }
  document.head.querySelectorAll('[data-page-meta]').forEach((element) => {
    element.remove()
  })
  document.head.append(fragment)
}
