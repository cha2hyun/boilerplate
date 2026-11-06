import { ApiError, createApiClient } from '@/shared/api'
import { env } from '@/shared/config'
import {
  demoLoginPath,
  demoLoginRequestSchema,
  demoSessionSchema,
  invalidLoginRequestSchema,
  rejectedCredentialsSchema,
  unavailableLoginSchema,
  type DemoCredentialErrors,
  type DemoLoginRequest,
  type DemoLoginScenario,
} from '../model/login-contract'
import { sessionStore } from '../model/session'

const request = createApiClient('')
interface DemoLoginOptions {
  scenario?: DemoLoginScenario
  signal?: AbortSignal
}
type SignInResult = { ok: true } | { ok: false; errors: DemoCredentialErrors }

class RejectedCredentials extends Error {
  readonly errors: DemoCredentialErrors

  constructor(errors: DemoCredentialErrors) {
    super('Demo credentials were rejected.')
    this.errors = errors
  }
}

async function readLoginError(response: Response) {
  const { status } = response
  if (status !== 400 && status !== 401 && status !== 503) return
  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
  }
  if (status === 401) {
    const parsed = rejectedCredentialsSchema.safeParse(payload)
    if (parsed.success) return new RejectedCredentials(parsed.data.errors)
  } else if (
    (status === 503 ? unavailableLoginSchema : invalidLoginRequestSchema).safeParse(payload).success
  ) {
    return new ApiError('Demo login request failed.', 'HTTP_ERROR', status)
  }
  return new ApiError('Unexpected demo login error response.', 'INVALID_RESPONSE', status)
}

async function signIn(body: DemoLoginRequest, signal?: AbortSignal): Promise<SignInResult> {
  if (env.dataSource !== 'demo') throw new ApiError('Demo login is unavailable.', 'HTTP_ERROR')
  try {
    const session = await request(demoLoginPath, demoSessionSchema, {
      method: 'POST',
      body: demoLoginRequestSchema.parse(body),
      signal,
      cache: 'no-store',
      mode: 'same-origin',
      credentials: 'omit',
      redirect: 'error',
      mapHttpError: readLoginError,
    })
    signal?.throwIfAborted()
    sessionStore.accept(session)
    return { ok: true }
  } catch (error) {
    signal?.throwIfAborted()
    if (body.method === 'credentials' && error instanceof RejectedCredentials) {
      return { ok: false, errors: error.errors }
    }
    throw error
  }
}

export function signInDemoAccount(
  email: string,
  password: string,
  { scenario = 'success', signal }: DemoLoginOptions = {},
) {
  return signIn({ method: 'credentials', email, password, scenario }, signal)
}

export function signInWithMicrosoftDemo({ scenario = 'success', signal }: DemoLoginOptions = {}) {
  return signIn({ method: 'microsoft', scenario }, signal)
}
