import { z } from 'zod'

export const projectStatusSchema = z.enum(['active', 'paused', 'archived'])

export const projectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters.')
    .max(80, 'Use 80 characters or fewer.'),
  description: z.string().trim().max(240, 'Use 240 characters or fewer.'),
  status: projectStatusSchema,
})

export const projectSchema = projectInputSchema.extend({
  id: z.string().min(1),
  owner: z.object({
    name: z.string().min(1),
    email: z.email(),
    initials: z.string().min(1).max(3),
  }),
  progress: z.number().min(0).max(100),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const projectsSchema = z
  .array(projectSchema)
  .refine((projects) => new Set(projects.map((project) => project.id)).size === projects.length, {
    message: 'Project IDs must be unique within a list.',
  })

export type Project = z.infer<typeof projectSchema>
export type ProjectInput = z.infer<typeof projectInputSchema>
export type ProjectStatus = z.infer<typeof projectStatusSchema>
