import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { projectSchema, type Project } from '@/entities/project'
import { i18n } from '@/shared/lib/i18n'
import { projectTableSearchDefaults } from '../model/search'
import { ProjectTable } from './project-table'

function ControlledProjectTable({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState(projectTableSearchDefaults)
  return (
    <ProjectTable
      projects={projects}
      search={search}
      onSearchChange={(patch) => {
        setSearch((previous) => ({ ...previous, ...patch }))
      }}
    />
  )
}

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
        <ControlledProjectTable projects={projects} />
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

describe('project URL pagination', () => {
  it('keeps a restored page while loading and after a successful response', async () => {
    await i18n.changeLanguage('en-US')
    const queryClient = new QueryClient()
    const onSearchChange = vi.fn()
    const search = { ...projectTableSearchDefaults, page: 2 }
    const projects = Array.from({ length: 9 }, (_, index) =>
      projectSchema.parse({
        id: String(index),
        name: `Project ${String(index)}`,
        description: '',
        status: 'active',
        owner: { name: 'Owner', email: 'owner@example.com', initials: 'OW' },
        progress: index,
        updatedAt: '2026-11-04T00:00:00Z',
      }),
    )
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProjectTable
          projects={[]}
          search={search}
          onSearchChange={onSearchChange}
          isLoading
          hasData={false}
        />
      </QueryClientProvider>,
    )
    expect(onSearchChange).not.toHaveBeenCalled()
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProjectTable projects={projects} search={search} onSearchChange={onSearchChange} hasData />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Page 2 of 2')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Project 8' })).toBeVisible()
    expect(onSearchChange).not.toHaveBeenCalled()

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProjectTable
          projects={[]}
          search={search}
          onSearchChange={onSearchChange}
          error={new Error('Projects are unavailable')}
          hasData={false}
        />
      </QueryClientProvider>,
    )
    expect(onSearchChange).not.toHaveBeenCalled()

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProjectTable
          projects={[]}
          search={search}
          onSearchChange={onSearchChange}
          isFetching
          hasData
        />
      </QueryClientProvider>,
    )
    expect(onSearchChange).not.toHaveBeenCalled()

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProjectTable projects={[]} search={search} onSearchChange={onSearchChange} hasData />
      </QueryClientProvider>,
    )
    expect(onSearchChange).toHaveBeenCalledWith({ page: 1 }, { replace: true })
    queryClient.clear()
  })
})
