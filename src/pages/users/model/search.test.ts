import { describe, expect, it } from 'vitest'
import type { WorkspaceUser } from '@/entities/workspace-user'
import { usersSearchDefaults, usersSearchSchema } from './search'
import { filterUsers } from './selectors'

describe('workspace directory URL state', () => {
  it('restores bounded text and status while keeping the detail independent from the filters', () => {
    expect(
      usersSearchSchema.parse({ q: ['alex'], status: 'invalid', id: 'x'.repeat(201) }),
    ).toEqual(usersSearchDefaults)
    expect(usersSearchSchema.parse({ q: 123, status: 'invited', id: ' usr_demo ' })).toEqual({
      q: '123',
      status: 'invited',
      id: 'usr_demo',
    })
    for (const id of ['.', '..']) expect(usersSearchSchema.parse({ id }).id).toBe('')
  })

  it('matches case-insensitive name or email and combines the status filter', () => {
    const users: WorkspaceUser[] = [
      {
        id: 'one',
        name: 'Alex Morgan',
        email: 'alex@example.com',
        role: 'admin',
        status: 'active',
      },
      { id: 'two', name: 'Kim', email: 'alex.kim@example.com', role: 'member', status: 'invited' },
    ]
    expect(filterUsers(users, { q: '  ALEX ', status: 'invited', id: 'one' })).toEqual([users[1]])
    expect(filterUsers(users, { q: 'MORGAN', status: 'all', id: '' })).toEqual([users[0]])
    expect(filterUsers(users, usersSearchDefaults)).toEqual(users)
  })
})
