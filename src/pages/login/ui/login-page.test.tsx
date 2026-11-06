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
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoCredentials, endDemoSession, getDemoSession } from '@/features/demo-session'
import { storageKeys } from '@/shared/config/product'
import { i18n } from '@/shared/lib/i18n'
import { LoginPage } from './login-page'

beforeEach(async () => {
  endDemoSession()
  await i18n.changeLanguage('en-US')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  async function deliver(response: Response) {
    await act(async () => {
      resolve(response)
      await promise
    })
  }
  return { promise, deliver }
}

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
  it('validates empty and malformed inputs locally, then focuses a rejected password and allows correction', async () => {
    const request = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json(
          {
            code: 'invalid_credentials',
            errors: { email: null, password: 'useDemoPassword' },
          },
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ id: 'usr_demo' }))
    const signedIn = vi.fn()
    const user = userEvent.setup()
    await renderLogin(signedIn)
    const email = screen.getByRole('textbox', { name: 'Email' })
    const password = screen.getByLabelText('Password', { exact: true })
    const submit = screen.getByRole('button', { name: 'Sign in' })
    await user.clear(email)
    await user.clear(password)
    await user.click(submit)
    await waitFor(() => expect(email).toHaveFocus())
    expect(email).toHaveAccessibleDescription(i18n.t('demoLogin:emailRequired'))
    expect(password).toHaveAttribute('aria-invalid', 'true')
    await user.type(email, 'invalid')
    expect(email).not.toHaveAttribute('aria-describedby')
    await user.type(password, 'a-different-value')
    await user.keyboard('{Enter}')
    expect(email).toHaveAccessibleDescription(i18n.t('demoLogin:emailInvalid'))
    expect(request).not.toHaveBeenCalled()

    await user.clear(email)
    await user.type(email, demoCredentials.email)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(password).toHaveFocus())
    expect(password).toHaveAccessibleDescription(i18n.t('demoLogin:useDemoPassword'))
    expect(request).toHaveBeenCalledTimes(1)
    expect(signedIn).not.toHaveBeenCalled()
    expect(getDemoSession()).toBeNull()
    await user.clear(password)
    await user.type(password, demoCredentials.password)
    expect(password).not.toHaveAttribute('aria-describedby')
    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(signedIn).toHaveBeenCalledOnce()
    })
    expect(getDemoSession()).toEqual({ id: 'usr_demo' })
  })

  it('starts with a masked sample and keeps both actions locked until the keyboard request succeeds', async () => {
    await i18n.changeLanguage('ko-KR')
    const response = deferredResponse()
    const request = vi.spyOn(globalThis, 'fetch').mockReturnValue(response.promise)
    const success = vi.spyOn(toast, 'success')
    const signedIn = vi.fn()
    const user = userEvent.setup()
    await renderLogin(signedIn)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^워크스페이스 로그인$/)
    expect(screen.getByRole('textbox', { name: '이메일' })).toHaveValue(demoCredentials.email)
    const password = screen.getByLabelText('비밀번호', { exact: true })
    expect(password).toHaveValue(demoCredentials.password)
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.queryByText(demoCredentials.password, { exact: true })).not.toBeInTheDocument()
    await user.click(password)
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('로그인 중…')
    expect(screen.getByRole('button', { name: '로그인 중…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Microsoft로 로그인' })).toBeDisabled()
    expect(getDemoSession()).toBeNull()
    expect(success).not.toHaveBeenCalled()
    const form = password.closest('form')
    if (!form) throw new Error('Expected a sign-in form')
    fireEvent.submit(form)
    expect(request).toHaveBeenCalledOnce()
    await response.deliver(Response.json({ id: 'usr_demo' }))
    expect(signedIn).toHaveBeenCalledOnce()
    expect(success).toHaveBeenCalledWith('데모 계정으로 로그인했습니다.')
    expect(sessionStorage.getItem(storageKeys.demoSession)).toBe('usr_demo')
    expect(password).toHaveValue('')
  })

  it.each([
    { locale: 'en-US', buttonKey: 'submit', method: 'credentials' },
    { locale: 'ko-KR', buttonKey: 'microsoft', method: 'microsoft' },
  ] as const)(
    'allows a $method retry after one simulated server error',
    async ({ locale, buttonKey, method }) => {
      await i18n.changeLanguage(locale)
      const failure = deferredResponse()
      const request = vi
        .spyOn(globalThis, 'fetch')
        .mockReturnValueOnce(failure.promise)
        .mockResolvedValueOnce(Response.json({ id: 'usr_demo' }))
      const signedIn = vi.fn()
      const user = userEvent.setup()
      await renderLogin(signedIn)
      const password = screen.getByLabelText(i18n.t('demoLogin:password'), { exact: true })
      if (method === 'microsoft') {
        await user.clear(screen.getByLabelText(i18n.t('demoLogin:email')))
        await user.clear(password)
      }
      const mode = screen.getByRole('button', { name: i18n.t('demoLogin:demoResponse') })
      await user.click(mode)
      await user.click(screen.getByRole('menuitemradio', { name: i18n.t('demoLogin:failure') }))
      const button = screen.getByRole('button', {
        name: i18n.t(`demoLogin:${buttonKey}`),
      })
      await user.click(button)
      expect(button).toBeDisabled()
      expect(mode).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent(
        i18n.t(method === 'microsoft' ? 'demoLogin:microsoftPending' : 'demoLogin:pending'),
      )
      await failure.deliver(Response.json({ code: 'unavailable' }, { status: 503 }))
      expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('demoLogin:serviceError'))
      expect(mode).toHaveAccessibleName(i18n.t('demoLogin:demoResponse'))
      expect(button).toBeEnabled()
      expect(button).toHaveAccessibleDescription(i18n.t('demoLogin:serviceError'))
      expect(getDemoSession()).toBeNull()
      await user.click(button)
      await waitFor(() => {
        expect(signedIn).toHaveBeenCalledOnce()
      })
      const bodies = request.mock.calls.map(([, options]) => {
        if (typeof options?.body !== 'string') throw new Error('Expected a JSON request body')
        return JSON.parse(options.body) as unknown
      })
      expect(bodies).toEqual(
        ['failure', 'success'].map((scenario) =>
          method === 'microsoft' ? { method, scenario } : { method, scenario, ...demoCredentials },
        ),
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(getDemoSession()).toEqual({ id: 'usr_demo' })
    },
  )

  it('cancels a pending request when browsing the dashboard even if a late response succeeds', async () => {
    const response = deferredResponse()
    const request = vi.spyOn(globalThis, 'fetch').mockReturnValue(response.promise)
    const signedIn = vi.fn()
    const user = userEvent.setup()
    await renderLogin(signedIn)
    await user.click(screen.getByRole('button', { name: 'Sign in with Microsoft' }))
    const browse = screen.getByRole('link', { name: 'Browse dashboard' })
    expect(browse).toHaveAttribute('href', new URL('/', window.location.href).href)
    await user.click(browse)
    expect(await screen.findByText('Public overview')).toBeVisible()
    expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    await response.deliver(Response.json({ id: 'usr_demo' }))
    expect(signedIn).not.toHaveBeenCalled()
    expect(getDemoSession()).toBeNull()
  })

  it('can retry after a cached document returns while its abandoned request is settling', async () => {
    const abandoned = deferredResponse()
    const retry = deferredResponse()
    const request = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(abandoned.promise)
      .mockReturnValueOnce(retry.promise)
    const signedIn = vi.fn()
    const user = userEvent.setup()
    await renderLogin(signedIn)
    const button = screen.getByRole('button', { name: 'Sign in' })
    await user.click(button)
    fireEvent(window, new PageTransitionEvent('pagehide', { persisted: true }))
    expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    expect(button).toBeEnabled()
    await user.click(button)
    await abandoned.deliver(Response.json({ id: 'usr_demo' }))
    expect(getDemoSession()).toBeNull()
    expect(signedIn).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
    const form = button.closest('form')
    if (!form) throw new Error('Expected a sign-in form')
    fireEvent.submit(form)
    expect(request).toHaveBeenCalledTimes(2)
    await retry.deliver(Response.json({ id: 'usr_demo' }))
    expect(request).toHaveBeenCalledTimes(2)
    expect(signedIn).toHaveBeenCalledOnce()
  })
})
