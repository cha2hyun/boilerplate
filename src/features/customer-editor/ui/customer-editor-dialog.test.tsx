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
import { customerSchema } from '@/entities/customer'
import { i18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { CustomerEditorDialog } from './customer-editor-dialog'

vi.mock(import('@/shared/config'), async (importOriginal) => {
  const config = await importOriginal()
  return { ...config, env: { ...config.env, dataSource: 'api' as const } }
})
const fetchMock = vi.fn<typeof fetch>()

const customer = customerSchema.parse({
  id: 'customer-1',
  name: 'Saved customer',
  email: 'saved@example.test',
  initials: 'SC',
  status: 'Active',
  city: 'Seoul',
  country: 'South Korea',
  joined: '2026-11-05',
  orders: 5,
  spent: 12000,
  lastOrder: '2026-11-04',
})

const clients: QueryClient[] = []
beforeEach(async () => {
  await i18n.changeLanguage('en-US')
  fetchMock.mockReset()
  fetchMock.mockImplementation(() => Promise.resolve(Response.json(customer)))
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
        <CustomerEditorDialog
          open={open}
          onOpenChange={setOpen}
          customer={edit ? customer : undefined}
        />
      </>
    )
  }
  const root = createRootRoute({ component: Outlet })
  const customers = createRoute({
    getParentRoute: () => root,
    path: '/customers',
    component: Editor,
  })
  const settings = createRoute({
    getParentRoute: () => root,
    path: '/settings',
    component: () => <h1>Settings destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([customers, settings]),
    history: createMemoryHistory({ initialEntries: ['/settings', '/customers'] }),
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

describe('customer editor input protection', () => {
  it('focuses the first invalid field and keeps invalid input out of the HTTP boundary', async () => {
    await renderEditor()
    const user = userEvent.setup()
    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.click(screen.getByRole('button', { name: 'Create customer' }))
    expect(name).toHaveFocus()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    await user.type(name, 'Valid customer')
    await user.click(screen.getByRole('button', { name: 'Create customer' }))
    const email = screen.getByRole('textbox', { name: 'Email' })
    expect(email).toHaveFocus()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveValue('Valid customer')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('closes a clean editor, protects dirty cancel and Escape, and resets a discarded draft on reopen', async () => {
    await renderEditor()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open editor' }))
    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.type(name, 'Unsaved customer')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveValue('Unsaved customer')
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Open editor' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats an edit reverted to its opening values as clean', async () => {
    await renderEditor(true)
    const user = userEvent.setup()
    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.type(name, ' changed')
    await user.clear(name)
    await user.type(name, customer.name)
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
    expect(router.history.location.pathname).toBe('/customers')
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    act(() => {
      finish(Response.json(customer))
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
    const router = await renderEditor(true)
    const user = userEvent.setup()
    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(name)
    await user.type(name, 'Uncertain customer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your changes may have been saved')
    expect(name).toHaveValue('Uncertain customer')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    act(() => {
      void router.navigate({ to: '/settings' })
    })
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(router.history.location.pathname).toBe('/customers')
    expect(name).toHaveValue('Uncertain customer')
  })
})
