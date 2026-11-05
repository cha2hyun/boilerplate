import { z } from 'zod'

export const customerStatuses = ['Active', 'Inactive'] as const

export const customerInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().max(254).pipe(z.email()),
  status: z.enum(customerStatuses),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  joined: z.iso.date(),
})

// Response fields remain independent of editor limits so existing long profiles can be read.
export const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  initials: z.string().min(1),
  status: z.enum(customerStatuses),
  city: z.string().min(1),
  country: z.string().min(1),
  joined: z.iso.date(),
  lastOrder: z.iso.date().nullable(),
  orders: z.number().int().nonnegative(),
  spent: z.number().int().nonnegative(),
})

export const customersSchema = z
  .array(customerSchema)
  .refine(
    (customers) => new Set(customers.map((customer) => customer.id)).size === customers.length,
    {
      message: 'Customer IDs must be unique within a list.',
    },
  )
export type SampleCustomer = z.infer<typeof customerSchema>
export type CustomerInput = z.infer<typeof customerInputSchema>
export type CustomerStatus = SampleCustomer['status']
