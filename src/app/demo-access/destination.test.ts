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

  it.each(['/account', '/Account/', '/account?extra=ignore#profile'])(
    'restores the protected account without copying unrecognized input for %s',
    (returnTo) => {
      expect(demoDestination(returnTo)).toEqual({ to: '/account' })
    },
  )

  it.each([
    undefined,
    '',
    '/',
    '/account/settings',
    '/users-other',
    '/orders',
    '//example.com/users',
    '/\\example.com/users',
    'https://example.com/users',
    'javascript:alert(1)',
  ])('opens the dashboard by default or for an unsupported destination %s', (returnTo) => {
    expect(demoDestination(returnTo)).toEqual({ to: '/' })
  })
})
