import { z } from 'zod'

export const exchangeRateSchema = z.object({
  date: z.iso.date(),
  base: z.literal('USD'),
  quote: z.literal('KRW'),
  rate: z.number().positive(),
})
export type ExchangeRate = z.infer<typeof exchangeRateSchema>
