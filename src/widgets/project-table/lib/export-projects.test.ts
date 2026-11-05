import { describe, expect, it } from 'vitest'
import { projectSchema } from '@/entities/project'
import { createProjectsCsv } from './export-projects'

const project = projectSchema.parse({
  id: 'exported',
  name: 'Exported project',
  description: 'Notes',
  status: 'active',
  owner: { name: 'Owner', email: 'owner@example.com', initials: 'OW' },
  progress: 50,
  updatedAt: '2026-11-05T00:00:00Z',
})
const labels = {
  headers: ['Project', 'Description', 'Status', 'Owner', 'Email', 'Progress', 'Updated'],
  statuses: { active: 'Active', paused: 'Paused', archived: 'Archived' },
}

describe('project CSV content', () => {
  it.each(['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '  =1+1', '\t+SUM(A1)', '\n@SUM(A1)'])(
    'neutralizes formula-like values including leading whitespace: %j',
    (name) => {
      const csv = createProjectsCsv([{ ...project, name }], labels)
      expect(csv).toContain(`\r\n"'${name}",`)
    },
  )

  it('quotes commas, quotes and newlines while preserving row order and fixed columns', () => {
    const csv = createProjectsCsv(
      [
        { ...project, name: 'First, "quoted"', description: 'First line\nSecond line' },
        { ...project, id: 'second', name: 'Second', status: 'paused' },
      ],
      labels,
    )
    expect(csv).toBe(
      [
        '"Project","Description","Status","Owner","Email","Progress","Updated"',
        '"First, ""quoted""","First line\nSecond line","Active","Owner","owner@example.com","50","2026-11-05T00:00:00Z"',
        '"Second","Notes","Paused","Owner","owner@example.com","50","2026-11-05T00:00:00Z"',
      ].join('\r\n'),
    )
  })
})
