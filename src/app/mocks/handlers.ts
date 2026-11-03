import { delay } from 'msw'
import { http, HttpResponse } from 'msw/http'
import { demoAnalytics } from '@/entities/analytics'
import { sampleCustomers } from '@/entities/customer'
import { sampleOrders } from '@/entities/order'
import { getSampleTraffic, trafficPeriodSchema } from '@/entities/traffic'
import { env } from '@/shared/config'

const responseOptions = { headers: { 'Cache-Control': 'no-store' } }

// Match only the demo's explicit read endpoints; other requests retain their real behavior.
export const handlers = [
  http.get(`${env.apiBaseUrl}/analytics`, async () => {
    await delay(450)
    return HttpResponse.json(demoAnalytics, responseOptions)
  }),
  http.get(`${env.apiBaseUrl}/traffic`, async ({ request }) => {
    const period = trafficPeriodSchema.safeParse(new URL(request.url).searchParams.get('period'))
    if (!period.success) {
      return HttpResponse.json({ message: 'Period must be 7, 14, or 30.' }, { status: 400 })
    }
    await delay(450)
    return HttpResponse.json(getSampleTraffic(period.data), responseOptions)
  }),
  http.get(`${env.apiBaseUrl}/orders`, async () => {
    await delay(450)
    return HttpResponse.json(sampleOrders, responseOptions)
  }),
  http.get(`${env.apiBaseUrl}/customers`, async () => {
    await delay(450)
    return HttpResponse.json(sampleCustomers, responseOptions)
  }),
]
