import { defaultParseSearch, defaultStringifySearch } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { searchPageSchema, searchTextSchema } from './search-params'

const searchSchema = z.object({ q: searchTextSchema, page: searchPageSchema })

describe('URL scalar filter boundaries', () => {
  it('preserves Korean, reserved characters and numeric text through Router serialization', () => {
    for (const q of ['디자인 팀 + 제품&개발', '1001', 'true', '  project  ']) {
      const search = searchSchema.parse(defaultParseSearch(defaultStringifySearch({ q })))
      expect(search.q).toBe(q)
    }
    expect(searchSchema.parse(defaultParseSearch('?q=1001')).q).toBe('1001')
  })

  it('bounds search input and does not stringify arbitrary query objects', () => {
    expect(searchTextSchema.parse('a'.repeat(200))).toHaveLength(200)
    for (const invalid of [undefined, null, true, ['hello'], { q: 'hello' }, 'a'.repeat(201)]) {
      expect(searchTextSchema.parse(invalid)).toBe('')
    }
  })

  it('only accepts bounded one-based integer pages from the Router parser', () => {
    expect(searchSchema.parse(defaultParseSearch('?page=2')).page).toBe(2)
    expect(searchPageSchema.parse(100_000)).toBe(100_000)
    for (const invalid of [undefined, null, true, [], {}, 0, -1, 1.5, 100_001, Infinity, '2']) {
      expect(searchPageSchema.parse(invalid)).toBe(1)
    }
  })
})
