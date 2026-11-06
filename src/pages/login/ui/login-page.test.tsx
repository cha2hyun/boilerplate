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
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(email).toHaveFocus())
    expect(email).toHaveAccessibleDescription('Enter the public demo email shown above.')
    expect(password).toHaveAttribute('aria-invalid', 'true')
    await user.type(email, demoCredentials.email)
    expect(email).not.toHaveAttribute('aria-describedby')
    await user.type(password, 'a-different-value')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(password).toHaveFocus())
    expect(password).toHaveAccessibleDescription(
      'Use the password shown under Public demo account.',
    )
    expect(signedIn).not.toHaveBeenCalled()
    expect(getDemoSession()).toBeNull()
    const browse = screen.getByRole('link', { name: 'Browse dashboard' })
    expect(browse).toHaveAttribute('href', new URL('/', window.location.href).href)
    await user.click(browse)
    expect(await screen.findByText('Public overview')).toBeVisible()
    expect(getDemoSession()).toBeNull()
  })

  it('fills the displayed demo values and signs in by keyboard without sending them', async () => {
    await i18n.changeLanguage('ko-KR')
    const request = vi.spyOn(globalThis, 'fetch')
    const signedIn = vi.fn()
    const user = userEvent.setup()
    await renderLogin(signedIn)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('로그인')
    expect(screen.getByText(demoCredentials.email, { exact: true })).toBeVisible()
    expect(screen.getByText(demoCredentials.password, { exact: true })).toBeVisible()
    expect(screen.getByLabelText('비밀번호', { exact: true })).toHaveValue('')
    await user.tab()
    expect(screen.getByRole('button', { name: '언어 선택' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: '데모 계정 채우기' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('textbox', { name: '이메일' })).toHaveValue(demoCredentials.email)
    expect(screen.getByLabelText('비밀번호', { exact: true })).toHaveValue(demoCredentials.password)
    expect(screen.getByRole('button', { name: '로그인' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(signedIn).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(storageKeys.demoSession)).toBe('usr_demo')
    expect(screen.getByLabelText('비밀번호', { exact: true })).toHaveValue('')
    expect(request).not.toHaveBeenCalled()
  })
})
