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
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/lib/i18n'
import { WorkspaceUserEditorDialog } from './workspace-user-editor-dialog'

const fetchMock = vi.fn<typeof fetch>()
const clients: QueryClient[] = []
beforeEach(async () => {
  await i18n.changeLanguage('en-US')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})
afterEach(() => {
  clients.splice(0).forEach((client) => {
    client.clear()
  })
  vi.unstubAllGlobals()
})

async function renderInvite() {
  function Invite() {
    const [open, setOpen] = useState(true)
    return open ? (
      <WorkspaceUserEditorDialog
        onClose={() => {
          setOpen(false)
        }}
        onSaved={() => {
          setOpen(false)
        }}
        onCloseAutoFocus={() => undefined}
      />
    ) : null
  }
  const root = createRootRoute({ component: Outlet })
  const invite = createRoute({ getParentRoute: () => root, path: '/users', component: Invite })
  const settings = createRoute({
    getParentRoute: () => root,
    path: '/settings',
    component: () => <h2>Settings destination</h2>,
  })
  const router = createRouter({
    routeTree: root.addChildren([invite, settings]),
    history: createMemoryHistory({ initialEntries: ['/users'] }),
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

it('keeps invalid and duplicate invitation input editable and protected until explicitly discarded', async () => {
  fetchMock.mockResolvedValue(Response.json({}, { status: 409 }))
  await renderInvite()
  const user = userEvent.setup()
  const name = screen.getByRole('textbox', { name: 'Name' })
  const email = screen.getByRole('textbox', { name: 'Email' })
  const create = screen.getByRole('button', { name: 'Create invitation' })
  await user.click(create)
  expect(name).toHaveFocus()
  expect(name).toHaveAccessibleDescription('Enter a name with 1–80 characters.')
  expect(fetchMock).not.toHaveBeenCalled()
  await user.type(name, 'Existing person')
  await user.type(email, 'existing@example.com')
  await user.click(create)
  await waitFor(() =>
    expect(email).toHaveAccessibleDescription('A user with this email already exists.'),
  )
  expect(email).toHaveFocus()
  expect(name).toHaveValue('Existing person')
  await user.keyboard('{Escape}')
  await user.click(await screen.findByRole('button', { name: 'Keep editing' }))
  await waitFor(() => expect(name).toHaveFocus())
  expect(email).toHaveValue('existing@example.com')
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  await user.click(await screen.findByRole('button', { name: 'Discard changes' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('blocks closing, navigation and duplicate submission while an invitation is in flight', async () => {
  let finish!: (response: Response) => void
  fetchMock.mockReturnValue(
    new Promise<Response>((resolve) => {
      finish = resolve
    }),
  )
  const router = await renderInvite()
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New person')
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'new@example.com')
  await user.click(screen.getByRole('button', { name: 'Create invitation' }))
  expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await act(async () => {
    // A blocked memory-history transition does not resolve a navigation until a later route load.
    void router.navigate({ to: '/settings' })
    await Promise.resolve()
  })
  expect(router.history.location.pathname).toBe('/users')
  expect(screen.getByRole('dialog')).toBeVisible()
  act(() => {
    finish(
      Response.json(
        {
          id: 'usr_new',
          name: 'New person',
          email: 'new@example.com',
          role: 'member',
          status: 'invited',
        },
        { status: 201 },
      ),
    )
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
