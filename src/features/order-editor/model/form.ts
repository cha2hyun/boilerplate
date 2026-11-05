import { orderInputSchema, type SampleOrder } from '@/entities/order'

function moneyInput(cents: number) {
  return `${String(Math.floor(cents / 100))}.${String(cents % 100).padStart(2, '0')}`
}

function today() {
  const now = new Date()
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function initialOrderForm(order?: SampleOrder) {
  return {
    customerName: order?.customer.name ?? '',
    customerEmail: order?.customer.email ?? '',
    date: order?.date ?? today(),
    status: order?.status ?? 'Processing',
    payment: order?.payment ?? 'Pending',
    city: order?.city ?? '',
    country: order?.country ?? '',
    shipping: moneyInput(order?.shipping ?? 0),
    items: order?.items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      unitPrice: moneyInput(item.unitPrice),
    })) ?? [{ name: '', quantity: '1', unitPrice: '' }],
  }
}

export type OrderFormInput = ReturnType<typeof initialOrderForm>

function integer(value: string) {
  return /^\d+$/u.test(value.trim()) ? Number(value.trim()) : Number.NaN
}

function cents(value: string) {
  const normalized = value.trim()
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/u.test(normalized)) return Number.NaN
  const [whole = '', fraction = ''] = normalized.split('.')
  return Number(`${whole || '0'}${fraction.padEnd(2, '0')}`)
}

export function parseOrderForm(input: OrderFormInput) {
  return orderInputSchema.safeParse({
    customer: { name: input.customerName, email: input.customerEmail.trim() },
    date: input.date,
    status: input.status,
    payment: input.payment,
    city: input.city,
    country: input.country,
    shipping: cents(input.shipping),
    items: input.items.map((item) => ({
      name: item.name,
      quantity: integer(item.quantity),
      unitPrice: cents(item.unitPrice),
    })),
  })
}
