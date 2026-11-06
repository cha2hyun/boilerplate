import { z } from 'zod'

export const workspaceRoles = ['admin', 'member', 'viewer'] as const
export const workspaceUserStatuses = ['active', 'invited', 'suspended'] as const

const roleSchema = z.enum(workspaceRoles)
const statusSchema = z.enum(workspaceUserStatuses)
const emailSchema = z.string().trim().max(254).toLowerCase().pipe(z.email())
export const workspaceUserIdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((id) => id !== '.' && id !== '..' && id.trim().length > 0)

export const workspaceUserInviteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  role: roleSchema,
})
export const workspaceUserUpdateSchema = z.object({ role: roleSchema, status: statusSchema })
export const workspaceUserSchema = z.object({
  id: workspaceUserIdSchema,
  name: z.string().trim().min(1),
  email: emailSchema,
  role: roleSchema,
  status: statusSchema,
})
export const workspaceUsersSchema = z
  .array(workspaceUserSchema)
  .refine(
    (users) =>
      new Set(users.map(({ id }) => id)).size === users.length &&
      new Set(users.map(({ email }) => email)).size === users.length,
    { message: 'Workspace user IDs and normalized email addresses must be unique.' },
  )
export type WorkspaceRole = (typeof workspaceRoles)[number]
export type WorkspaceUserStatus = (typeof workspaceUserStatuses)[number]
export type WorkspaceUserInvite = z.infer<typeof workspaceUserInviteSchema>
export type WorkspaceUserUpdate = z.infer<typeof workspaceUserUpdateSchema>
export type WorkspaceUser = z.infer<typeof workspaceUserSchema>

export const currentDemoUserId = 'usr_demo'
export const currentDemoUser = {
  id: currentDemoUserId,
  name: 'Alex Morgan',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
} as const satisfies WorkspaceUser
