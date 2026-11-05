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
import { usePreferences } from '@/features/workspace-preferences'
import { i18n } from '@/shared/lib/i18n'
import { ThemeContext } from '@/shared/lib/theme'
import { RouterTextLink } from '@/shared/ui/text-link'
import { SettingsPage } from './settings-page'

vi.mock(import('@/features/workspace-preferences'), async (importOriginal) => {
  const preferences = await importOriginal()
  return {
    ...preferences,
    usePreferences: preferences.createPreferencesStore(undefined, {
      workspaceName: 'Orbit Studio',
      compactMode: true,
    }),
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  localStorage.clear()
  await i18n.changeLanguage('en-US')
  usePreferences.getState().reset()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

async function renderSettings() {
  const root = createRootRoute({ component: Outlet })
  const settings = createRoute({
    getParentRoute: () => root,
    path: '/settings',
    component: () => (
      <ThemeContext value={{ theme: 'system', resolvedTheme: 'light', setTheme: vi.fn() }}>
        <RouterTextLink to="/projects">Open projects</RouterTextLink>
        <SettingsPage />
      </ThemeContext>
    ),
  })
  const projects = createRoute({
    getParentRoute: () => root,
    path: '/projects',
    component: () => <h1>Projects destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([settings, projects]),
    history: createMemoryHistory({ initialEntries: ['/projects', '/settings'] }),
  })
  await act(async () => {
    await router.load()
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('workspace preference reset', () => {
  it('resets the form and persisted store to configured defaults without leaving unsaved changes', async () => {
    usePreferences.getState().save({ workspaceName: 'Personal workspace', compactMode: false })
    const user = userEvent.setup()
    await renderSettings()
    const name = screen.getByRole('textbox', { name: 'Workspace name' })
    const compact = screen.getByRole('switch', { name: 'Compact layout' })
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(name).toHaveValue('Personal workspace')
    expect(compact).not.toBeChecked()
    expect(save).toBeDisabled()

    await user.clear(name)
    await user.type(name, 'x')
    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 2 characters')

    await user.type(name, 'y')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'false')
    expect(name).toHaveAttribute('aria-describedby', 'workspace-hint')
    expect(usePreferences.getState().workspaceName).toBe('Personal workspace')
    await user.clear(name)
    await user.type(name, 'x')
    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 2 characters')

    await user.click(screen.getByRole('button', { name: 'Reset preferences' }))
    expect(name).toHaveValue('Orbit Studio')
    expect(compact).toBeChecked()
    expect(save).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(usePreferences.getState()).toMatchObject({
      workspaceName: 'Orbit Studio',
      compactMode: true,
    })
    expect(JSON.parse(localStorage.getItem('blueprint-preferences') ?? 'null')).toEqual({
      state: { workspaceName: 'Orbit Studio', compactMode: true },
      version: 1,
    })
  })
})

describe('settings unsaved input', () => {
  it('restores a reachable editing tab when a draft is hidden by the appearance tab', async () => {
    await renderSettings()
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Workspace name' }), ' changed')
    await user.click(screen.getByRole('tab', { name: 'Appearance' }))
    await user.click(screen.getByRole('link', { name: 'Open projects' }))
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'General' })).toHaveFocus())
    await user.keyboard('{Enter}')
    expect(screen.getByRole('textbox', { name: 'Workspace name' })).toHaveValue(
      'Orbit Studio changed',
    )
  })

  it('keeps a dirty draft and input focus on cancellation, then discards only the draft on navigation', async () => {
    const router = await renderSettings()
    const user = userEvent.setup()
    const name = screen.getByRole('textbox', { name: 'Workspace name' })
    await user.clear(name)
    await user.type(name, 'Unsaved workspace')
    await user.click(screen.getByRole('link', { name: 'Open projects' }))
    expect(await screen.findByRole('alertdialog')).toHaveAccessibleName('Discard unsaved changes?')
    expect(router.state.location.pathname).toBe('/settings')
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveValue('Unsaved workspace')
    expect(usePreferences.getState().workspaceName).toBe('Orbit Studio')

    await user.click(screen.getByRole('link', { name: 'Open projects' }))
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByRole('heading', { name: 'Projects destination' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/projects')
    expect(usePreferences.getState().workspaceName).toBe('Orbit Studio')
  })

  it('protects a compact-mode draft and allows navigation after reverting it', async () => {
    const router = await renderSettings()
    const user = userEvent.setup()
    const compact = screen.getByRole('switch', { name: 'Compact layout' })
    await user.click(compact)
    act(() => {
      void router.navigate({ to: '/projects' })
    })
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/settings')
    expect(compact).not.toBeChecked()
    await user.click(compact)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await user.click(screen.getByRole('link', { name: 'Open projects' }))
    expect(await screen.findByRole('heading', { name: 'Projects destination' })).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it.each(['clean', 'save', 'reset'] as const)('does not prompt after %s state', async (state) => {
    await renderSettings()
    const user = userEvent.setup()
    if (state !== 'clean') {
      await user.type(screen.getByRole('textbox', { name: 'Workspace name' }), ' changed')
      await user.click(
        screen.getByRole('button', {
          name: state === 'save' ? 'Save changes' : 'Reset preferences',
        }),
      )
    }
    await user.click(screen.getByRole('link', { name: 'Open projects' }))
    expect(await screen.findByRole('heading', { name: 'Projects destination' })).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
