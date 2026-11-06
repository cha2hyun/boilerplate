// @vitest-environment node
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  demoCredentials,
  demoLoginPath,
  endDemoSession,
  getDemoSession,
  signInDemoAccount,
  signInWithMicrosoftDemo,
} from '@/features/demo-session'
import { createDemoHandlers } from './handlers'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { dataSource: 'demo', apiBaseUrl: 'https://business.example.test/api' },
}))
vi.mock('@/shared/config', () => ({ env: mockEnv }))

const origin = 'http://localhost'
const server = setupServer()
beforeAll(() => {
  vi.stubGlobal('location', new URL(origin))
  server.resetHandlers(...createDemoHandlers())
  server.listen({ onUnhandledFrame: 'error' })
})
afterEach(() => {
  endDemoSession()
  server.resetHandlers(...createDemoHandlers())
  mockEnv.dataSource = 'demo'
})
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

describe('same-origin demo login HTTP', () => {
  it('waits for successful credential verification before accepting the demo ID', async () => {
    const result = signInDemoAccount(
      `  ${demoCredentials.email.toUpperCase()} `,
      demoCredentials.password,
    )
    expect(getDemoSession()).toBeNull()
    await expect(result).resolves.toEqual({ ok: true })
    expect(getDemoSession()).toEqual({ id: 'usr_demo' })
  })

  it('returns field errors from the server for rejected credentials', async () => {
    await expect(signInDemoAccount('wrong@example.com', 'wrong-password')).resolves.toEqual({
      ok: false,
      errors: { email: 'useDemoEmail', password: 'useDemoPassword' },
    })
    expect(getDemoSession()).toBeNull()
  })

  it('rejects malformed JSON, scenario, or Microsoft requests carrying form values', async () => {
    for (const body of [
      '{broken',
      JSON.stringify({ method: 'microsoft', scenario: 'unsupported' }),
      JSON.stringify({ method: 'microsoft', scenario: 'success', ...demoCredentials }),
    ]) {
      const response = await fetch(`${origin}${demoLoginPath}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      })
      expect(response.status).toBe(400)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toEqual({ code: 'invalid_request' })
    }
  })

  it('keeps the session empty on 503 through either method and accepts a subsequent retry', async () => {
    const options = { scenario: 'failure' } as const
    await Promise.all([
      expect(
        signInDemoAccount(demoCredentials.email, demoCredentials.password, options),
      ).rejects.toMatchObject({
        code: 'HTTP_ERROR',
        status: 503,
      }),
      expect(signInWithMicrosoftDemo(options)).rejects.toMatchObject({
        code: 'HTTP_ERROR',
        status: 503,
      }),
    ])
    expect(getDemoSession()).toBeNull()
    const request = vi.spyOn(globalThis, 'fetch')
    await expect(signInWithMicrosoftDemo()).resolves.toEqual({ ok: true })
    expect(request).toHaveBeenCalledWith(
      demoLoginPath,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ method: 'microsoft', scenario: 'success' }),
        mode: 'same-origin',
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
      }),
    )
    expect(getDemoSession()).toEqual({ id: 'usr_demo' })
  })

  it.each([
    { status: 200, payload: { id: 'unknown' } },
    { status: 200, payload: { id: 'usr_demo', token: 'unexpected' } },
    {
      status: 401,
      payload: { code: 'invalid_credentials', errors: { email: 'arbitrary', password: null } },
    },
    {
      status: 401,
      payload: { code: 'invalid_credentials', errors: { email: null, password: null } },
    },
    { status: 503, payload: { code: 'invalid_credentials' } },
  ])('rejects malformed success/error payloads for status $status', async ({ status, payload }) => {
    server.use(http.post(demoLoginPath, () => HttpResponse.json(payload, { status })))
    await expect(
      signInDemoAccount(demoCredentials.email, demoCredentials.password),
    ).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status,
    })
    expect(getDemoSession()).toBeNull()
  })

  it('keeps an aborted slow login from creating a session', async () => {
    const controller = new AbortController()
    const pending = signInWithMicrosoftDemo({ scenario: 'slow', signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toBe(controller.signal.reason)
    expect(getDemoSession()).toBeNull()
  })

  it('prevents demo requests in API mode', async () => {
    mockEnv.dataSource = 'api'
    const request = vi.spyOn(globalThis, 'fetch')
    await expect(signInWithMicrosoftDemo()).rejects.toMatchObject({ code: 'HTTP_ERROR' })
    await expect(
      signInDemoAccount(demoCredentials.email, demoCredentials.password),
    ).rejects.toMatchObject({
      code: 'HTTP_ERROR',
    })
    expect(request).not.toHaveBeenCalled()
    expect(getDemoSession()).toBeNull()
  })
})
