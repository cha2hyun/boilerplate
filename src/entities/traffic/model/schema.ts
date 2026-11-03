import { z } from 'zod'

export const trafficPeriodSchema = z.enum(['7', '14', '30'])

export const trafficSchema = z.object({
  days: z.array(
    z.object({
      date: z.iso.date(),
      visitors: z.number().int().nonnegative(),
      sessions: z.number().int().nonnegative(),
      pageViews: z.number().int().nonnegative(),
      bounces: z.number().int().nonnegative(),
    }),
  ),
  visitors: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  pageViews: z.number().int().nonnegative(),
  bounceRate: z.number().min(0).max(100),
  sources: z.array(
    z.object({
      source: z.string(),
      sessions: z.number().int().nonnegative(),
      share: z.number().min(0).max(100),
    }),
  ),
  pages: z.array(
    z.object({
      path: z.string(),
      views: z.number().int().nonnegative(),
      share: z.number().min(0).max(100),
    }),
  ),
  devices: z.array(
    z.object({
      device: z.string(),
      sessions: z.number().int().nonnegative(),
    }),
  ),
})

export type TrafficPeriod = z.infer<typeof trafficPeriodSchema>
export type Traffic = z.infer<typeof trafficSchema>
