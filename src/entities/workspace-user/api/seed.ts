import { currentDemoUser, type WorkspaceUser } from '../model/schema'

export const seedWorkspaceUsers: WorkspaceUser[] = [
  currentDemoUser,
  {
    id: 'usr_jordan',
    name: 'Jordan Lee',
    email: 'jordan@example.com',
    role: 'member',
    status: 'active',
  },
  {
    id: 'usr_sam',
    name: 'Sam Rivera',
    email: 'sam@example.com',
    role: 'viewer',
    status: 'invited',
  },
  {
    id: 'usr_taylor',
    name: 'Taylor Kim',
    email: 'taylor@example.com',
    role: 'member',
    status: 'suspended',
  },
]
