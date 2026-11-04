import { describe, expect, it } from 'vitest'
import { inboxSearchDefaults, inboxSearchSchema } from './search'

describe('inbox search state', () => {
  it('defaults omitted parameters and keeps only view state in the URL contract', () => {
    expect(inboxSearchSchema.parse({})).toEqual(inboxSearchDefaults)
    expect(
      inboxSearchSchema.parse({
        view: 'archived',
        q: 'Brand asset',
        selectedId: 'brand-assets',
        unread: true,
        messages: [],
      }),
    ).toEqual({ view: 'archived', q: 'Brand asset' })
  })

  it.each(['all', 'unread', 'archived'])('accepts the %s view with a search term', (view) => {
    expect(inboxSearchSchema.parse({ view, q: 'planning workshop' })).toEqual({
      view,
      q: 'planning workshop',
    })
  })

  it.each(['other', null, 1, true, ['unread'], { view: 'unread' }])(
    'defaults an invalid view without clearing a valid search: %j',
    (view) => {
      expect(inboxSearchSchema.parse({ view, q: 'planning workshop' })).toEqual({
        view: 'all',
        q: 'planning workshop',
      })
    },
  )

  it.each([null, true, ['planning'], { query: 'planning' }, 'x'.repeat(201)])(
    'defaults malformed or oversized search without changing the view: %j',
    (q) => {
      expect(inboxSearchSchema.parse({ view: 'unread', q })).toEqual({
        view: 'unread',
        q: '',
      })
    },
  )
})
