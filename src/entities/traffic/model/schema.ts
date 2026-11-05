import { z } from 'zod'

export const trafficPeriodSchema = z.enum(['7', '14', '30'])

const trafficDaySchema = z
  .object({
    date: z.iso.date(),
    visitors: z.number().int().nonnegative(),
    sessions: z.number().int().nonnegative(),
    pageViews: z.number().int().nonnegative(),
    bounces: z.number().int().nonnegative(),
  })
  .refine((day) => day.visitors <= day.sessions, {
    message: 'Daily visitors cannot exceed sessions.',
    path: ['visitors'],
  })
  .refine((day) => day.sessions <= day.pageViews, {
    message: 'Daily sessions cannot exceed page views.',
    path: ['sessions'],
  })
  .refine((day) => day.bounces <= day.sessions, {
    message: 'Daily bounces cannot exceed sessions.',
    path: ['bounces'],
  })

export const trafficSchema = z
  .object({
    days: z
      .array(trafficDaySchema)
      .refine((days) => new Set(days.map((day) => day.date)).size === days.length, {
        message: 'Traffic must contain at most one entry per calendar date.',
      })
      .transform((days) => days.toSorted((left, right) => left.date.localeCompare(right.date))),
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
  .refine((traffic) => traffic.visitors <= traffic.sessions, {
    message: 'Visitors cannot exceed sessions.',
    path: ['visitors'],
  })
  .refine((traffic) => traffic.sessions <= traffic.pageViews, {
    message: 'Sessions cannot exceed page views.',
    path: ['sessions'],
  })

export type TrafficPeriod = z.infer<typeof trafficPeriodSchema>
export type Traffic = z.infer<typeof trafficSchema>
