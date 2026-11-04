import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { projectSchema } from '@/entities/project'
import { i18n } from '@/shared/lib/i18n'
import { ProjectTable } from './project-table'

describe('project timestamp sorting', () => {
  it('orders mixed timezone offsets by their actual instant in both directions', async () => {
    await i18n.changeLanguage('en-US')
    const queryClient = new QueryClient()
    const projects = [
      { id: 'earlier', name: 'Earlier project', updatedAt: '2026-11-04T10:00:00+09:00' },
      { id: 'later', name: 'Later project', updatedAt: '2026-11-04T09:00:00Z' },
    ].map((project) =>
      projectSchema.parse({
        ...project,
        description: '',
        status: 'active',
        owner: { name: 'Owner', email: 'owner@example.com', initials: 'OW' },
        progress: 0,
      }),
    )
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectTable projects={projects} />
      </QueryClientProvider>,
    )
    const rowNames = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map(
          (row) =>
            within(row).getByRole('button', { name: /^(Earlier|Later) project$/ }).textContent,
        )
    expect(rowNames()).toEqual(['Later project', 'Earlier project'])
    await userEvent.click(screen.getByRole('button', { name: 'Last updated' }))
    expect(rowNames()).toEqual(['Earlier project', 'Later project'])
    queryClient.clear()
  })
})
