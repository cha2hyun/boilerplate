import type { WorkspaceUser } from '@/entities/workspace-user'
import type { UsersSearch } from './search'

export function filterUsers(users: WorkspaceUser[], { q, status }: UsersSearch) {
  const term = q.trim().toLowerCase()
  return users.filter(
    (user) =>
      (status === 'all' || user.status === status) &&
      (user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)),
  )
}
