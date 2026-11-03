import { z } from 'zod'
import { apiClient } from '@/shared/api'
import { projectInputSchema, projectSchema, projectsSchema } from '../model/schema'
import type { ProjectAdapter } from './types'

export const httpProjectAdapter: ProjectAdapter = {
  list: (signal) => apiClient('/projects', projectsSchema, { signal }),
  create: (input, signal) =>
    apiClient('/projects', projectSchema, {
      method: 'POST',
      body: projectInputSchema.parse(input),
      signal,
    }),
  update: (id, input, signal) =>
    apiClient(`/projects/${encodeURIComponent(id)}`, projectSchema, {
      method: 'PATCH',
      body: projectInputSchema.parse(input),
      signal,
    }),
  async delete(id, signal) {
    await apiClient(`/projects/${encodeURIComponent(id)}`, z.null(), {
      method: 'DELETE',
      signal,
    })
  },
}
