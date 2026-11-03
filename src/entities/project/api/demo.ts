import { z } from 'zod'
import { ApiError, delay } from '@/shared/api'
import { projectInputSchema, projectSchema, projectsSchema } from '../model/schema'
import type { Project } from '../model/schema'
import { seedProjects } from './seed'
import type { ProjectAdapter } from './types'

export const PROJECT_STORAGE_KEY = 'orbit.demo.projects.v1'
const persistedSchema = z.object({ version: z.literal(1), projects: projectsSchema })
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

interface DemoOptions {
  storage?: StorageAdapter | null
  delayMs?: number
  now?: () => Date
  createId?: () => string
}

function browserStorage(): StorageAdapter | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** A browser-only demo repository. Never treat this data as a secure backend. */
export function createDemoProjectAdapter(options: DemoOptions = {}): ProjectAdapter {
  let storage = options.storage === undefined ? browserStorage() : options.storage
  let memory = projectsSchema.parse(seedProjects)
  const now = options.now ?? (() => new Date())
  const createId = options.createId ?? (() => `prj_${crypto.randomUUID()}`)
  const latency = options.delayMs ?? 280

  function persist(projects: Project[]) {
    memory = projectsSchema.parse(projects)
    try {
      storage?.setItem(PROJECT_STORAGE_KEY, JSON.stringify({ version: 1, projects: memory }))
    } catch {
      // Restricted storage and quota errors still permit an in-memory demo session.
      storage = null
    }
  }

  function read(): Project[] {
    if (!storage) return projectsSchema.parse(memory)

    let raw: string | null
    try {
      raw = storage.getItem(PROJECT_STORAGE_KEY)
    } catch {
      storage = null
      return projectsSchema.parse(memory)
    }

    if (raw === null) {
      persist(memory)
      return projectsSchema.parse(memory)
    }

    try {
      const parsed = persistedSchema.safeParse(JSON.parse(raw))
      if (parsed.success) {
        memory = parsed.data.projects
        return projectsSchema.parse(memory)
      }
    } catch {
      // Malformed persisted data is not allowed across the runtime boundary.
    }

    persist(projectsSchema.parse(seedProjects))
    return projectsSchema.parse(memory)
  }

  function notFound(): never {
    throw new ApiError('This project could not be found. Refresh and try again.', 'HTTP_ERROR', 404)
  }

  return {
    async list(signal) {
      await delay(latency, signal)
      return read()
    },
    async create(input, signal) {
      const validated = projectInputSchema.parse(input)
      await delay(latency, signal)
      const project = projectSchema.parse({
        ...validated,
        id: createId(),
        owner: { name: 'Alex Morgan', email: 'alex@example.com', initials: 'AM' },
        progress: 0,
        updatedAt: now().toISOString(),
      })
      persist([project, ...read()])
      return project
    },
    async update(id, input, signal) {
      const validated = projectInputSchema.parse(input)
      await delay(latency, signal)
      const projects = read()
      const existing = projects.find((project) => project.id === id)
      if (!existing) notFound()
      const updated = projectSchema.parse({
        ...existing,
        ...validated,
        updatedAt: now().toISOString(),
      })
      persist(projects.map((project) => (project.id === id ? updated : project)))
      return updated
    },
    async delete(id, signal) {
      await delay(latency, signal)
      const projects = read()
      if (!projects.some((project) => project.id === id)) notFound()
      persist(projects.filter((project) => project.id !== id))
    },
  }
}
