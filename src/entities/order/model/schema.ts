import { z } from 'zod'

export const orderStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const
export const orderPaymentStatuses = ['Paid', 'Pending', 'Refunded'] as const
export const orderLimits = { items: 50, quantity: 10_000, money: 100_000_000 } as const

const moneySchema = z.number().int().min(0).max(orderLimits.money)
const customerInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
})

export const orderInputSchema = z.object({
  customer: customerInputSchema,
  date: z.iso.date(),
  status: z.enum(orderStatuses),
  payment: z.enum(orderPaymentStatuses),
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  shipping: moneySchema,
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        quantity: z.number().int().min(1).max(orderLimits.quantity),
        unitPrice: moneySchema,
      }),
    )
    .min(1)
    .max(orderLimits.items),
})

export const orderSchema = orderInputSchema.extend({
  id: z.string().min(1),
  // Server-owned content may be longer than the limits for a new editor submission.
  customer: z.object({ name: z.string().min(1), email: z.email(), initials: z.string().min(1) }),
  city: z.string(),
  country: z.string(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1).max(orderLimits.quantity),
        unitPrice: moneySchema,
      }),
    )
    .min(1)
    .max(orderLimits.items),
})

export const ordersSchema = z.array(orderSchema)
export type SampleOrder = z.infer<typeof orderSchema>
export type OrderInput = z.infer<typeof orderInputSchema>
export type OrderStatus = SampleOrder['status']
