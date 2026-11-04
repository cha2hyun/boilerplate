import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePreferences } from '@/features/workspace-preferences'
import { i18n } from '@/shared/lib/i18n'
import { ThemeContext } from '@/shared/lib/theme'
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

describe('workspace preference reset', () => {
  it('resets the form and persisted store to configured defaults without leaving unsaved changes', async () => {
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
    usePreferences.getState().save({ workspaceName: 'Personal workspace', compactMode: false })
    const user = userEvent.setup()
    render(
      <ThemeContext value={{ theme: 'system', resolvedTheme: 'light', setTheme: vi.fn() }}>
        <SettingsPage />
      </ThemeContext>,
    )
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
