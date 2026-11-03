import { z } from 'zod'

export const customerStatuses = ['Active', 'Inactive'] as const

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  initials: z.string(),
  status: z.enum(customerStatuses),
  city: z.string(),
  country: z.string(),
  joined: z.iso.date(),
  lastOrder: z.iso.date().nullable(),
  orders: z.number().int().nonnegative(),
  spent: z.number().int().nonnegative(),
})

export const customersSchema = z.array(customerSchema)
export type SampleCustomer = z.infer<typeof customerSchema>
export type CustomerStatus = SampleCustomer['status']
