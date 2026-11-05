import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectSchema } from '@/entities/project'
import { i18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { ProjectEditorDialog } from './project-editor-dialog'

vi.mock(import('@/shared/config'), async (importOriginal) => {
  const config = await importOriginal()
  return { ...config, env: { ...config.env, dataSource: 'api' as const } }
})
const fetchMock = vi.fn<typeof fetch>()

const project = projectSchema.parse({
  id: 'project-1',
  name: 'Saved project',
  description: 'Saved description',
  status: 'active',
  owner: { name: 'Owner', email: 'owner@example.com', initials: 'OW' },
  progress: 0,
  updatedAt: '2026-11-05T00:00:00Z',
})

const clients: QueryClient[] = []
beforeEach(async () => {
  await i18n.changeLanguage('en-US')
  fetchMock.mockReset()
  fetchMock.mockImplementation(() => Promise.resolve(Response.json(project)))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})
afterEach(() => {
  clients.splice(0).forEach((client) => {
    client.clear()
  })
  vi.unstubAllGlobals()
})

async function renderEditor(edit = false) {
  function Editor() {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true)
          }}
        >
          Open editor
        </Button>
        <ProjectEditorDialog
          open={open}
          onOpenChange={setOpen}
          project={edit ? project : undefined}
        />
      </>
    )
  }
  const root = createRootRoute({ component: Outlet })
  const projects = createRoute({ getParentRoute: () => root, path: '/projects', component: Editor })
  const settings = createRoute({
    getParentRoute: () => root,
    path: '/settings',
    component: () => <h1>Settings destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([projects, settings]),
    history: createMemoryHistory({ initialEntries: ['/settings', '/projects'] }),
  })
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  clients.push(client)
  await act(async () => {
    await router.load()
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('project editor input protection', () => {
  it('closes a clean editor, protects dirty cancel and Escape, and resets a discarded draft on reopen', async () => {
    await renderEditor()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open editor' }))
    const name = screen.getByRole('textbox', { name: 'Project name' })
    await user.type(name, 'Unsaved project')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveValue('Unsaved project')
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Open editor' }))
    expect(screen.getByRole('textbox', { name: 'Project name' })).toHaveValue('')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats an edit reverted to its opening values as clean', async () => {
    await renderEditor(true)
    const user = userEvent.setup()
    const name = screen.getByRole('textbox', { name: 'Project name' })
    await user.type(name, ' changed')
    await user.clear(name)
    await user.type(name, project.name)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('blocks close and navigation during a clean pending save, then releases protection on success', async () => {
    let finish!: (value: Response) => void
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve
      }),
    )
    const router = await renderEditor(true)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await act(async () => {
      void router.navigate({ to: '/settings' })
      await Promise.resolve()
    })
    expect(router.history.location.pathname).toBe('/projects')
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    act(() => {
      finish(Response.json(project))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    act(() => {
      void router.navigate({ to: '/settings' })
    })
    expect(await screen.findByRole('heading', { name: 'Settings destination' })).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('keeps failed mutation input protected and preserves an uncertain-write explanation', async () => {
    fetchMock.mockRejectedValue(new TypeError('Response lost'))
    const router = await renderEditor()
    const user = userEvent.setup()
    const name = screen.getByRole('textbox', { name: 'Project name' })
    await user.type(name, 'Uncertain project')
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your changes may have been saved')
    expect(name).toHaveValue('Uncertain project')
    act(() => {
      void router.navigate({ to: '/settings' })
    })
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(router.history.location.pathname).toBe('/projects')
    expect(name).toHaveValue('Uncertain project')
  })
})
