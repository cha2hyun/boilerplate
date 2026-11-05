import { delay } from 'msw'
import { http, HttpResponse } from 'msw/http'
import type { z } from 'zod'
import { demoAnalytics } from '@/entities/analytics'
import { createDemoCustomerAdapter, customerInputSchema } from '@/entities/customer'
import { createDemoOrderAdapter, orderInputSchema } from '@/entities/order'
import { getSampleTraffic, trafficPeriodSchema } from '@/entities/traffic'
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

async function mutationResponse(action: () => Promise<unknown>, status = 200) {
  try {
    const value = await action()
    return status === 204
      ? new HttpResponse(null, { ...responseOptions, status })
      : Response.json(value, { ...responseOptions, status })
  } catch (error) {
    const status = error instanceof ApiError && error.status === 404 ? 404 : 500
    return HttpResponse.json(
      { message: status === 404 ? 'Record not found.' : 'The change could not be saved.' },
      { ...responseOptions, status },
    )
  }
}

// Factories isolate persistent demo state and allow tests to inject in-memory adapters.
export function createDemoHandlers({
  orders = createDemoOrderAdapter({ delayMs: 0 }),
  customers = createDemoCustomerAdapter({ delayMs: 0 }),
  delayMs = 450,
} = {}) {
  return [
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
      await delay(delayMs)
      return HttpResponse.json(await orders.list(request.signal), responseOptions)
    }),
    http.post(`${apiBaseUrl}/orders`, async ({ request }) => {
      const input = await readInput(request, orderInputSchema)
      if (!input) return invalidInput()
      await delay(delayMs)
      return mutationResponse(() => orders.create(input, request.signal), 201)
    }),
    http.patch(`${apiBaseUrl}/orders/:id`, async ({ request, params }) => {
      const input = await readInput(request, orderInputSchema)
      if (!input || typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return mutationResponse(() => orders.update(id, input, request.signal))
    }),
    http.delete(`${apiBaseUrl}/orders/:id`, async ({ request, params }) => {
      if (typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return mutationResponse(() => orders.delete(id, request.signal), 204)
    }),
    http.get(`${apiBaseUrl}/customers`, async ({ request }) => {
      await delay(delayMs)
      return HttpResponse.json(await customers.list(request.signal), responseOptions)
    }),
    http.post(`${apiBaseUrl}/customers`, async ({ request }) => {
      const input = await readInput(request, customerInputSchema)
      if (!input) return invalidInput()
      await delay(delayMs)
      return mutationResponse(() => customers.create(input, request.signal), 201)
    }),
    http.patch(`${apiBaseUrl}/customers/:id`, async ({ request, params }) => {
      const input = await readInput(request, customerInputSchema)
      if (!input || typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return mutationResponse(() => customers.update(id, input, request.signal))
    }),
    http.delete(`${apiBaseUrl}/customers/:id`, async ({ request, params }) => {
      if (typeof params.id !== 'string') return invalidInput()
      const id = params.id
      await delay(delayMs)
      return mutationResponse(() => customers.delete(id, request.signal), 204)
    }),
  ]
}

// Only explicitly declared app endpoints are mocked. External APIs retain real behavior.
export const handlers = createDemoHandlers()
