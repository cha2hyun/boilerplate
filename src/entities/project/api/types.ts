import type { Project, ProjectInput } from '../model/schema'

export interface ProjectAdapter {
  list(signal?: AbortSignal): Promise<Project[]>
  create(input: ProjectInput, signal?: AbortSignal): Promise<Project>
  update(id: string, input: ProjectInput, signal?: AbortSignal): Promise<Project>
  delete(id: string, signal?: AbortSignal): Promise<void>
}
