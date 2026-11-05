import { useRef, useState } from 'react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { UnsavedChangesDialog } from '@/shared/ui/unsaved-changes-dialog'
import { useUnsavedChanges } from './use-unsaved-changes'

function ProtectedInput({
  dirty,
  onResolution,
}: {
  dirty: boolean
  onResolution: (discard: boolean) => void
}) {
  const focusRef = useRef<HTMLInputElement>(null)
  const protection = useUnsavedChanges({ dirty, focusRef })
  return (
    <>
      <Input aria-label="Draft" ref={focusRef} />
      <Button
        onClick={() => {
          void protection.requestLeave().then(onResolution)
        }}
      >
        Try close
      </Button>
      <UnsavedChangesDialog {...protection.dialogProps} />
    </>
  )
}

async function renderGuards(count = 1, onResolution: (discard: boolean) => void = () => undefined) {
  function Editor() {
    const [dirty, setDirty] = useState(true)
    const [mounted, setMounted] = useState(true)
    return (
      <>
        <Button
          onClick={() => {
            setDirty(false)
          }}
        >
          Clear externally
        </Button>
        <Button
          onClick={() => {
            setMounted(false)
          }}
        >
          Unmount editor
        </Button>
        {mounted &&
          Array.from({ length: count }, (_, index) => (
            <ProtectedInput key={index} dirty={dirty} onResolution={onResolution} />
          ))}
      </>
    )
  }
  const root = createRootRoute({ component: Outlet })
  const settings = createRoute({ getParentRoute: () => root, path: '/settings', component: Editor })
  const projects = createRoute({
    getParentRoute: () => root,
    path: '/projects',
    component: () => <h1>Destination</h1>,
  })
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Other destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([settings, projects, index]),
    history: createMemoryHistory({ initialEntries: ['/settings'] }),
  })
  await act(async () => {
    await router.load()
  })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(async () => {
  await i18n.changeLanguage('en-US')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('unsaved-change navigation lifecycle', () => {
  it('keeps the first attempted destination when another navigation arrives during confirmation', async () => {
    const router = await renderGuards()
    act(() => {
      void router.navigate({ to: '/projects' })
    })
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await act(async () => {
      void router.navigate({ to: '/' })
      await Promise.resolve()
    })
    expect(router.history.location.pathname).toBe('/settings')
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByRole('heading', { name: 'Destination' })).toBeVisible()
    expect(router.history.location.pathname).toBe('/projects')
  })

  it.each(['Clear externally', 'Unmount editor'])(
    'settles the outstanding confirmation when the form is cleared by %s',
    async (action) => {
      const onResolution = vi.fn()
      const router = await renderGuards(1, onResolution)
      const control = screen.getByRole('button', { name: action })
      await userEvent.click(screen.getByRole('button', { name: 'Try close' }))
      expect(await screen.findByRole('alertdialog')).toBeVisible()
      fireEvent.click(control)
      await waitFor(() => {
        expect(onResolution).toHaveBeenCalledExactlyOnceWith(false)
      })
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(router.history.location.pathname).toBe('/settings')
      act(() => {
        void router.navigate({ to: '/projects' })
      })
      expect(await screen.findByRole('heading', { name: 'Destination' })).toBeVisible()
    },
  )

  it('does not bypass another mounted blocker when one form is discarded', async () => {
    const router = await renderGuards(2)
    act(() => {
      void router.navigate({ to: '/projects' })
    })
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    expect(router.history.location.pathname).toBe('/settings')
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(router.history.location.pathname).toBe('/settings')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
