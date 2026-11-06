import { delay } from 'msw'
import { http, HttpResponse } from 'msw/http'
import type { z } from 'zod'
import { demoAnalytics } from '@/entities/analytics'
import { createDemoCustomerAdapter, customerInputSchema } from '@/entities/customer'
import { createDemoOrderAdapter, orderInputSchema, orderListParamsSchema } from '@/entities/order'
import { getSampleTraffic, trafficPeriodSchema } from '@/entities/traffic'
import {
  createDemoWorkspaceUserAdapter,
  currentDemoUser,
  workspaceUserInviteSchema,
  workspaceUserUpdateSchema,
} from '@/entities/workspace-user'
import {
  checkDemoCredentials,
  demoLoginPath,
  demoLoginRequestSchema,
} from '@/features/demo-session'
import { ApiError } from '@/shared/api'
import { env } from '@/shared/config'

const apiBaseUrl = env.apiBaseUrl.replace(/\/$/u, '')
const responseOptions = { headers: { 'Cache-Control': 'no-store' } }

async function readInput<Value>(request: Request, schema: z.ZodType<Value>) {
  try {
    const parsed = schema.safeParse(await request.json())
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function invalidInput() {
  return HttpResponse.json({ message: 'Invalid input.' }, { ...responseOptions, status: 400 })
}

async function adapterResponse(action: () => Promise<unknown>, status = 200) {
  try {
    const value = await action()
    return status === 204
      ? new HttpResponse(null, { ...responseOptions, status })
      : Response.json(value, { ...responseOptions, status })
  } catch (error) {
    const status =
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404 || error.status === 409)
        ? error.status
        : 500
    const messages: Record<number, string> = {
      403: 'This record cannot be changed.',
      404: 'Record not found.',
      409: 'The record already exists.',
    }
    return HttpResponse.json(
      { message: messages[status] ?? 'The change could not be saved.' },
      { ...responseOptions, status },
    )
  }
}

// Factories isolate persistent demo state and allow tests to inject in-memory adapters.
export function createDemoHandlers({
  orders = createDemoOrderAdapter({ delayMs: 0 }),
  customers = createDemoCustomerAdapter({ delayMs: 0 }),
  workspaceUsers = createDemoWorkspaceUserAdapter(),
  delayMs = 450,
} = {}) {
  return [
    http.post(demoLoginPath, async ({ request }) => {
      const input = await readInput(request, demoLoginRequestSchema)
      if (!input) {
        return HttpResponse.json({ code: 'invalid_request' }, { ...responseOptions, status: 400 })
      }
      await delay(input.scenario === 'slow' ? 2500 : 1000)
      if (input.scenario === 'failure') {
        return HttpResponse.json({ code: 'unavailable' }, { ...responseOptions, status: 503 })
      }
      if (input.method === 'credentials') {
        const errors = checkDemoCredentials(input.email, input.password)
        if (errors.email || errors.password) {
          return HttpResponse.json(
            { code: 'invalid_credentials', errors },
            { ...responseOptions, status: 401 },
          )
        }
      }
      return HttpResponse.json({ id: currentDemoUser.id }, responseOptions)
    }),
    http.get(`${apiBaseUrl}/workspace-users`, async ({ request }) => {
      await delay(delayMs)
      return adapterResponse(() => workspaceUsers.list(request.signal))
    }),
    http.get(`${apiBaseUrl}/workspace-users/:id`, async ({ request, params }) => {
      const id = params.id
      if (typeof id !== 'string') return invalidInput()
      await delay(delayMs)
      return adapterResponse(() => workspaceUsers.detail(id, request.signal))
    }),
    http.post(`${apiBaseUrl}/workspace-users`, async ({ request }) => {
      const input = await readInput(request, workspaceUserInviteSchema)
      if (!input) return invalidInput()
      await delay(delayMs)
      return adapterResponse(() => workspaceUsers.invite(input, request.signal), 201)
    }),
    http.patch(`${apiBaseUrl}/workspace-users/:id`, async ({ request, params }) => {
      const input = await readInput(request, workspaceUserUpdateSchema)
      const id = params.id
      if (!input || typeof id !== 'string') return invalidInput()
      await delay(delayMs)
      return adapterResponse(() => workspaceUsers.update(id, input, request.signal))
    }),
    http.get(`${apiBaseUrl}/analytics`, async () => {
      await delay(delayMs)
      return HttpResponse.json(demoAnalytics, responseOptions)
    }),
    http.get(`${apiBaseUrl}/traffic`, async ({ request }) => {
      const period = trafficPeriodSchema.safeParse(new URL(request.url).searchParams.get('period'))
      if (!period.success) {
        return HttpResponse.json(
          { message: 'Period must be 7, 14, or 30.' },
          { ...responseOptions, status: 400 },
        )
      }
      await delay(delayMs)
      return HttpResponse.json(getSampleTraffic(period.data), responseOptions)
    }),
    http.get(`${apiBaseUrl}/orders`, async ({ request }) => {
      const search = Object.fromEntries(new URL(request.url).searchParams)
      const params = orderListParamsSchema.safeParse({
        ...search,
        ...(search.page !== undefined
          ? { page: /^\d+$/.test(search.page) ? Number(search.page) : Number.NaN }
          : {}),
        ...(search.pageSize !== undefined
          ? { pageSize: /^\d+$/.test(search.pageSize) ? Number(search.pageSize) : Number.NaN }
          : {}),
      })
      if (!params.success) return invalidInput()
      await delay(delayMs)
      return HttpResponse.json(await orders.list(params.data, request.signal), responseOptions)
    }),
    http.get(`${apiBaseUrl}/orders/summary/counts`, async ({ request }) => {
      await delay(delayMs)
      return HttpResponse.json(await orders.summary(request.signal), responseOptions)
    }),
    http.get(`${apiBaseUrl}/orders/:id`, async ({ request, params }) => {
      if (typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return adapterResponse(() => orders.detail(id, request.signal))
    }),
    http.post(`${apiBaseUrl}/orders`, async ({ request }) => {
      const input = await readInput(request, orderInputSchema)
      if (!input) return invalidInput()
      await delay(delayMs)
      return adapterResponse(() => orders.create(input, request.signal), 201)
    }),
    http.patch(`${apiBaseUrl}/orders/:id`, async ({ request, params }) => {
      const input = await readInput(request, orderInputSchema)
      if (!input || typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return adapterResponse(() => orders.update(id, input, request.signal))
    }),
    http.delete(`${apiBaseUrl}/orders/:id`, async ({ request, params }) => {
      if (typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return adapterResponse(() => orders.delete(id, request.signal), 204)
    }),
    http.get(`${apiBaseUrl}/customers`, async ({ request }) => {
      await delay(delayMs)
      return HttpResponse.json(await customers.list(request.signal), responseOptions)
    }),
    http.post(`${apiBaseUrl}/customers`, async ({ request }) => {
      const input = await readInput(request, customerInputSchema)
      if (!input) return invalidInput()
      await delay(delayMs)
      return adapterResponse(() => customers.create(input, request.signal), 201)
    }),
    http.patch(`${apiBaseUrl}/customers/:id`, async ({ request, params }) => {
      const input = await readInput(request, customerInputSchema)
      if (!input || typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return adapterResponse(() => customers.update(id, input, request.signal))
    }),
    http.delete(`${apiBaseUrl}/customers/:id`, async ({ request, params }) => {
      if (typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return adapterResponse(() => customers.delete(id, request.signal), 204)
    }),
  ]
}
