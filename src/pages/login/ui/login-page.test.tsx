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
import { demoCredentials, endDemoSession, getDemoSession } from '@/features/demo-session'
import { storageKeys } from '@/shared/config/product'
import { i18n } from '@/shared/lib/i18n'
import { LoginPage } from './login-page'

beforeEach(async () => {
  endDemoSession()
  await i18n.changeLanguage('en-US')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.restoreAllMocks()
})

async function renderLogin(onSignedIn: () => void) {
  const root = createRootRoute({ component: Outlet })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <p>Public overview</p>,
  })
  const login = createRoute({
    getParentRoute: () => root,
    path: '/login',
    component: () => <LoginPage onSignedIn={onSignedIn} />,
  })
  const router = createRouter({
    routeTree: root.addChildren([home, login]),
    history: createMemoryHistory({ initialEntries: ['/login'] }),
  })
  await act(async () => {
    await router.load()
  })
  render(<RouterProvider router={router} />)
}

describe('public demo login', () => {
  it('connects invalid field feedback to the first incorrect input and clears it on edit', async () => {
    const signedIn = vi.fn()
    const user = userEvent.setup()
    await renderLogin(signedIn)
    const email = screen.getByRole('textbox', { name: 'Email' })
    const password = screen.getByLabelText('Password', { exact: true })
    await user.clear(email)
    await user.clear(password)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(email).toHaveFocus())
    expect(email).toHaveAccessibleDescription(i18n.t('demoLogin:emailRequired'))
    expect(password).toHaveAttribute('aria-invalid', 'true')
    await user.type(email, demoCredentials.email)
    expect(email).not.toHaveAttribute('aria-describedby')
    await user.type(password, 'a-different-value')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(password).toHaveFocus())
    expect(password).toHaveAccessibleDescription(i18n.t('demoLogin:useDemoPassword'))
    expect(signedIn).not.toHaveBeenCalled()
    expect(getDemoSession()).toBeNull()
    const browse = screen.getByRole('link', { name: 'Browse dashboard' })
    expect(browse).toHaveAttribute('href', new URL('/', window.location.href).href)
    await user.click(browse)
    expect(await screen.findByText('Public overview')).toBeVisible()
    expect(getDemoSession()).toBeNull()
  })

  it('starts with usable demo credentials and submits the masked password by keyboard', async () => {
    await i18n.changeLanguage('ko-KR')
    const request = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected login request'))
    const signedIn = vi.fn()
    const user = userEvent.setup()
    await renderLogin(signedIn)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('로그인')
    expect(screen.getByRole('textbox', { name: '이메일' })).toHaveValue(demoCredentials.email)
    const password = screen.getByLabelText('비밀번호', { exact: true })
    expect(password).toHaveValue(demoCredentials.password)
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.queryByText(demoCredentials.password, { exact: true })).not.toBeInTheDocument()
    await user.click(password)
    await user.keyboard('{Enter}')
    expect(signedIn).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(storageKeys.demoSession)).toBe('usr_demo')
    expect(screen.getByLabelText('비밀번호', { exact: true })).toHaveValue('')
    expect(request).not.toHaveBeenCalled()
  })

  it.each([
    { locale: 'en-US', email: '', password: '', button: 'Sign in with Microsoft', separator: 'or' },
    {
      locale: 'ko-KR',
      email: 'wrong@example.com',
      password: 'unrelated-value',
      button: 'Microsoft로 로그인',
      separator: '또는',
    },
  ])(
    'opens the same local demo session through the $locale Microsoft action independently of the form',
    async ({ locale, email, password, button, separator }) => {
      await i18n.changeLanguage(locale)
      const request = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Unexpected login request'))
      const signedIn = vi.fn()
      const user = userEvent.setup()
      await renderLogin(signedIn)
      const emailInput = screen.getByRole('textbox', { name: i18n.t('demoLogin:email') })
      const passwordInput = screen.getByLabelText(i18n.t('demoLogin:password'), { exact: true })
      await user.clear(emailInput)
      await user.clear(passwordInput)
      if (email) await user.type(emailInput, email)
      if (password) await user.type(passwordInput, password)
      expect(screen.getByText(separator, { exact: true })).toBeVisible()
      await user.click(screen.getByRole('button', { name: button }))
      expect(getDemoSession()).toEqual({ id: 'usr_demo' })
      expect(sessionStorage.getItem(storageKeys.demoSession)).toBe('usr_demo')
      expect(signedIn).toHaveBeenCalledTimes(1)
      expect(request).not.toHaveBeenCalled()
    },
  )
})
