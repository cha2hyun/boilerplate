import type { WorkspaceUser, WorkspaceUserInvite, WorkspaceUserUpdate } from '../model/schema'

export interface WorkspaceUserAdapter {
  list(signal?: AbortSignal): Promise<WorkspaceUser[]>
  detail(id: string, signal?: AbortSignal): Promise<WorkspaceUser>
  invite(input: WorkspaceUserInvite, signal?: AbortSignal): Promise<WorkspaceUser>
  update(id: string, input: WorkspaceUserUpdate, signal?: AbortSignal): Promise<WorkspaceUser>
}
