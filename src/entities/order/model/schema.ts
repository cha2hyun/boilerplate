import { z } from 'zod'

export const orderStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const

export const orderSchema = z.object({
  id: z.string(),
  customer: z.object({ name: z.string(), email: z.email(), initials: z.string() }),
  date: z.iso.date(),
  status: z.enum(orderStatuses),
  payment: z.enum(['Paid', 'Pending', 'Refunded']),
  city: z.string(),
  country: z.string(),
  shipping: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().int().nonnegative(),
    }),
  ),
})

export const ordersSchema = z.array(orderSchema)
export type SampleOrder = z.infer<typeof orderSchema>
export type OrderStatus = SampleOrder['status']
