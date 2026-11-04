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
  revenue: z
    .array(
      z.object({
        date: z.iso.date(),
        revenue: z.number().nonnegative(),
        previousRevenue: z.number().nonnegative(),
      }),
    )
    .refine((days) => new Set(days.map((day) => day.date)).size === days.length, {
      message: 'Revenue must contain at most one entry per calendar date.',
    })
    .transform((days) => days.toSorted((left, right) => left.date.localeCompare(right.date))),
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
