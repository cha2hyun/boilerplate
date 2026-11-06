import { z } from 'zod'
import { ApiError, delay } from '@/shared/api'
import { storageKeys } from '@/shared/config/product'
import {
  currentDemoUser,
  currentDemoUserId,
  workspaceUserInviteSchema,
  workspaceUsersSchema,
  workspaceUserUpdateSchema,
  type WorkspaceUser,
} from '../model/schema'
import { seedWorkspaceUsers } from './seed'
import type { WorkspaceUserAdapter } from './types'

const persistedSchema = z
  .object({ version: z.literal(1), users: workspaceUsersSchema })
  .refine(
    ({ users }) =>
      users.some(
        (user) =>
          user.id === currentDemoUserId &&
          user.name === currentDemoUser.name &&
          user.email === currentDemoUser.email &&
          user.role === currentDemoUser.role &&
          user.status === currentDemoUser.status,
      ),
    { message: 'The saved demo workspace must include its original owner.' },
  )
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>
interface DemoOptions {
  storage?: StorageAdapter | null
  delayMs?: number
  onStorageUnavailable?: () => void
}

function browserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Demo IDs identify local records and never act as credentials. */
function nextInviteId(users: WorkspaceUser[]) {
  const ids = new Set(users.map(({ id }) => id))
  let next = users.length + 1
  while (ids.has(`usr_invite_${String(next)}`)) next += 1
  return `usr_invite_${String(next)}`
}

export function createDemoWorkspaceUserAdapter(options: DemoOptions = {}): WorkspaceUserAdapter {
  let storage = options.storage === undefined ? browserStorage() : options.storage
  let memory = workspaceUsersSchema.parse(seedWorkspaceUsers)
  const latency = options.delayMs ?? 0

  function fallBackToMemory() {
    storage = null
    try {
      options.onStorageUnavailable?.()
    } catch {
      /* The local session remains usable. */
    }
  }
  if (!storage) fallBackToMemory()

  function persist(users: WorkspaceUser[]) {
    memory = workspaceUsersSchema.parse(users)
    try {
      storage?.setItem(
        storageKeys.demoWorkspaceUsers,
        JSON.stringify({ version: 1, users: memory }),
      )
    } catch {
      fallBackToMemory()
    }
  }

  function read() {
    if (storage) {
      let raw: string | null
      try {
        raw = storage.getItem(storageKeys.demoWorkspaceUsers)
      } catch {
        fallBackToMemory()
        return workspaceUsersSchema.parse(memory)
      }
      if (raw === null) persist(memory)
      else {
        try {
          const parsed = persistedSchema.parse(JSON.parse(raw))
          memory = parsed.users
        } catch {
          persist(seedWorkspaceUsers)
        }
      }
    }
    return workspaceUsersSchema.parse(memory)
  }

  function find(users: WorkspaceUser[], id: string) {
    const user = users.find((candidate) => candidate.id === id)
    if (!user) throw new ApiError('Workspace user not found.', 'HTTP_ERROR', 404)
    return user
  }

  return {
    async list(signal) {
      await delay(latency, signal)
      return read()
    },
    async detail(id, signal) {
      await delay(latency, signal)
      return find(read(), id)
    },
    async invite(input, signal) {
      const validated = workspaceUserInviteSchema.parse(input)
      await delay(latency, signal)
      const users = read()
      if (users.some((user) => user.email === validated.email)) {
        throw new ApiError('Email already belongs to a workspace user.', 'HTTP_ERROR', 409)
      }
      const user: WorkspaceUser = { ...validated, id: nextInviteId(users), status: 'invited' }
      persist([user, ...users])
      return user
    },
    async update(id, input, signal) {
      const validated = workspaceUserUpdateSchema.parse(input)
      await delay(latency, signal)
      if (id === currentDemoUserId) {
        throw new ApiError('The demo account is read-only.', 'HTTP_ERROR', 403)
      }
      const users = read()
      const updated = { ...find(users, id), ...validated }
      persist(users.map((user) => (user.id === id ? updated : user)))
      return updated
    },
  }
}
