import { describe, expect, it } from 'vitest'
import { demoDestination } from './destination'

describe('demo login return destination', () => {
  it('restores only validated directory fields including a search string that looks numeric', () => {
    expect(
      demoDestination('/users/?id=usr_demo&q=%22007%22&status=unknown&unexpected=true'),
    ).toEqual({
      to: '/users',
      search: { id: 'usr_demo', q: '007', status: 'all' },
    })
  })

  it.each([
    undefined,
    '/account',
    '/users-other',
    '/orders',
    '//example.com/users',
    '/\\example.com/users',
    'https://example.com/users',
    'javascript:alert(1)',
  ])('returns to the local account for %s', (returnTo) => {
    expect(demoDestination(returnTo)).toEqual({ to: '/account' })
  })
})
