import { describe, expect, it } from 'vitest'
import { resources } from './resources'

function flattenMessages(value: unknown, prefix = '', result: Record<string, string> = {}) {
  if (typeof value === 'string') {
    result[prefix] = value
  } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenMessages(child, prefix ? `${prefix}.${key}` : key, result)
    }
  } else {
    throw new Error(`Translation ${prefix} must contain a string or nested messages.`)
  }
  return result
}

function interpolationNames(message: string) {
  return [
    ...new Set(
      [...message.matchAll(/{{\s*-?\s*([^},\s]+)(?:,[^}]*)?\s*}}/g)].map((match) => match[1]),
    ),
  ].sort()
}

describe('bundled locale resource completeness', () => {
  it('provides both supported locales with the same public namespaces', () => {
    expect(Object.keys(resources).sort()).toEqual(['en-US', 'ko-KR'])
    expect(Object.keys(resources['en-US']).sort()).toEqual([
      'admin',
      'common',
      'customerEditor',
      'examples',
      'orderEditor',
      'workspace',
    ])
    expect(Object.keys(resources['ko-KR']).sort()).toEqual(Object.keys(resources['en-US']).sort())
  })

  it.each(Object.keys(resources['en-US']) as (keyof (typeof resources)['en-US'])[])(
    '%s has matching nonempty messages and interpolation names without relying on fallback',
    (namespace) => {
      // Inspect the raw resources: i18next fallback could conceal a missing Korean message.
      const english = flattenMessages(resources['en-US'][namespace])
      const korean = flattenMessages(resources['ko-KR'][namespace])
      expect(Object.keys(korean).sort()).toEqual(Object.keys(english).sort())
      expect(Object.keys(english).length).toBeGreaterThan(0)
      for (const [key, message] of Object.entries(english)) {
        const translated = korean[key]
        expect(message.trim(), `en-US:${namespace}:${key}`).not.toBe('')
        expect(translated?.trim(), `ko-KR:${namespace}:${key}`).not.toBe('')
        expect(interpolationNames(translated ?? ''), `${namespace}:${key}`).toEqual(
          interpolationNames(message),
        )
      }
    },
  )
})
