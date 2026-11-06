import { z } from 'zod'
import { avatarUrlSchema } from '@/shared/lib/avatar-url'

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
  // Legacy API data stays readable; edits require a server-issued revision.
  revision: z.number().int().positive().optional(),
  // Existing API responses and browser records have no fabricated historical events.
  history: z.array(orderHistoryEntrySchema).max(orderLimits.history).default([]),
  // Server-owned content may be longer than the limits for a new editor submission.
  customer: z.object({
    name: z.string().min(1),
    email: z.email(),
    initials: z.string().min(1),
    avatarUrl: avatarUrlSchema,
  }),
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

export const orderSortValues = ['newest', 'oldest', 'highest', 'lowest'] as const
export const orderListParamsSchema = z.object({
  q: z.string().max(200).default(''),
  status: z.enum(['all', ...orderStatuses]).default('all'),
  sort: z.enum(orderSortValues).default('newest'),
  page: z.number().int().min(1).max(100_000).default(1),
  pageSize: z.union([z.literal(6), z.literal(12), z.literal(24)]).default(6),
})
export const orderListDefaults = orderListParamsSchema.parse({})
export const orderPageSchema = z
  .object({
    items: ordersSchema,
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1).max(100_000),
    pageSize: z.union([z.literal(6), z.literal(12), z.literal(24)]),
  })
  .refine(
    (result) => {
      const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize))
      return (
        result.page <= pageCount &&
        result.items.length ===
          Math.min(result.pageSize, Math.max(0, result.total - (result.page - 1) * result.pageSize))
      )
    },
    { message: 'Page metadata and item count must agree.' },
  )
export const orderSummarySchema = z
  .object({
    total: z.number().int().nonnegative(),
    counts: z.object({
      Processing: z.number().int().nonnegative(),
      Shipped: z.number().int().nonnegative(),
      Delivered: z.number().int().nonnegative(),
      Cancelled: z.number().int().nonnegative(),
    }),
  })
  .refine(
    (summary) =>
      Object.values(summary.counts).reduce((sum, count) => sum + count, 0) === summary.total,
    { message: 'Order status counts must sum to the total.' },
  )
export type OrderListParams = z.infer<typeof orderListParamsSchema>
export type OrderPage = z.infer<typeof orderPageSchema>
export type OrderSummary = z.infer<typeof orderSummarySchema>
