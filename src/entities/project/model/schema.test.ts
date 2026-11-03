import { describe, expect, it } from 'vitest'
import { seedProjects } from '../api/seed'
import { projectInputSchema, projectSchema } from './schema'

const validInput = { name: 'New project', description: 'A useful project', status: 'active' }

describe('project schemas', () => {
  it('normalizes editable text', () => {
    expect(
      projectInputSchema.parse({
        ...validInput,
        name: '  New project  ',
        description: '  A useful project  ',
      }),
    ).toEqual(validInput)
  })

  it.each([
    { name: '  ' },
    { name: 'a'.repeat(81) },
    { description: 'a'.repeat(241) },
    { status: 'deleted' },
  ])('rejects invalid input %j', (invalid) => {
    expect(projectInputSchema.safeParse({ ...validInput, ...invalid }).success).toBe(false)
  })

  it.each([
    { progress: 101 },
    { progress: -1 },
    { updatedAt: 'yesterday' },
    { owner: { name: 'Owner', email: 'invalid', initials: 'O' } },
  ])('rejects malformed project data %j', (invalid) => {
    expect(projectSchema.safeParse({ ...seedProjects[0], ...invalid }).success).toBe(false)
  })
})
