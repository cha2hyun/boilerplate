import { z } from 'zod'

export const analyticsSchema = z.object({
  kpis: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.number(),
      change: z.number(),
      format: z.enum(['currency', 'number', 'percent']),
      description: z.string(),
    }),
  ),
  revenue: z.array(
    z.object({
      date: z.iso.date(),
      revenue: z.number().nonnegative(),
      previousRevenue: z.number().nonnegative(),
    }),
  ),
  activity: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      time: z.iso.datetime({ offset: true }),
      type: z.enum(['project', 'member', 'billing']),
    }),
  ),
})

export type Analytics = z.infer<typeof analyticsSchema>
