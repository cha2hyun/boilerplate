import { z } from 'zod'

export const orderStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const
export const orderPaymentStatuses = ['Paid', 'Pending', 'Refunded'] as const
export const orderLimits = {
  items: 50,
  quantity: 10_000,
  money: 100_000_000,
  history: 100,
} as const

export const orderHistoryEntrySchema = z
  .discriminatedUnion('field', [
    z.object({
      field: z.literal('status'),
      occurredAt: z.iso.datetime({ offset: true }),
      from: z.enum(orderStatuses).nullable(),
      to: z.enum(orderStatuses),
    }),
    z.object({
      field: z.literal('payment'),
      occurredAt: z.iso.datetime({ offset: true }),
      from: z.enum(orderPaymentStatuses).nullable(),
      to: z.enum(orderPaymentStatuses),
    }),
  ])
  .refine((entry) => entry.from !== entry.to, {
    message: 'History entries must record an applied change.',
  })

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
  // Existing API responses and browser records have no fabricated historical events.
  history: z.array(orderHistoryEntrySchema).max(orderLimits.history).default([]),
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

export const ordersSchema = z
  .array(orderSchema)
  .refine((orders) => new Set(orders.map((order) => order.id)).size === orders.length, {
    message: 'Order IDs must be unique within a list.',
  })
export type SampleOrder = z.infer<typeof orderSchema>
export type OrderInput = z.infer<typeof orderInputSchema>
export type OrderStatus = SampleOrder['status']
export type OrderPaymentStatus = SampleOrder['payment']
export type OrderHistoryEntry = z.infer<typeof orderHistoryEntrySchema>
