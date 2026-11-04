import { describe, expect, it } from 'vitest'
import { projectTableSearchDefaults, projectTableSearchSchema } from './search'

describe('project table URL search', () => {
  it('restores supported filters, sort, and one-based pagination', () => {
    expect(
      projectTableSearchSchema.parse({
        q: 'Phoenix',
        status: 'paused',
        sort: 'progress',
        order: 'asc',
        page: 2,
        pageSize: '16',
      }),
    ).toEqual({
      q: 'Phoenix',
      status: 'paused',
      sort: 'progress',
      order: 'asc',
      page: 2,
      pageSize: 16,
    })
  })

  it('falls back per field for malformed or unsupported values', () => {
    expect(
      projectTableSearchSchema.parse({
        q: ['Phoenix'],
        status: 'deleted',
        sort: 'owner',
        order: 'sideways',
        page: -1,
        pageSize: 10,
      }),
    ).toEqual(projectTableSearchDefaults)
    expect(projectTableSearchSchema.parse({ q: 'a'.repeat(201) }).q).toBe('')
    expect(projectTableSearchSchema.parse({ q: 1001 }).q).toBe('1001')
    expect(projectTableSearchSchema.parse({ status: 'paused', page: 1.5 })).toEqual({
      ...projectTableSearchDefaults,
      status: 'paused',
    })
  })

  it('limits pagination to positive whole pages and offered page sizes', () => {
    for (const page of [0, -1, 1.5, 100_001, 'invalid', [], {}, true, null]) {
      expect(projectTableSearchSchema.parse({ page }).page).toBe(1)
    }
    for (const pageSize of [8, 16, 32]) {
      expect(projectTableSearchSchema.parse({ pageSize }).pageSize).toBe(pageSize)
    }
    for (const pageSize of [0, 5, 10, -8, 8.5, [], {}, true, null]) {
      expect(projectTableSearchSchema.parse({ pageSize }).pageSize).toBe(8)
    }
  })
})
