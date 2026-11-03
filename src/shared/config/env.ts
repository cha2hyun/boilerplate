import { z } from 'zod'

const envSchema = z.object({
  VITE_DATA_SOURCE: z.enum(['demo', 'api']).default('demo'),
  VITE_API_BASE_URL: z
    .string()
    .trim()
    .default('/api')
    .refine((value) => {
      if (/[\\\s?#]/.test(value)) return false
      if (/^\/(?!\/)/.test(value)) return true
      if (!/^https?:\/\//i.test(value)) return false
      try {
        const url = new URL(value)
        return (
          (url.protocol === 'http:' || url.protocol === 'https:') &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash
        )
      } catch {
        return false
      }
    }, 'Use an absolute HTTP(S) URL or a path beginning with /'),
})

export function parseEnv(input: unknown) {
  const result = envSchema.safeParse(input)

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid application environment. ${message}`)
  }

  return {
    dataSource: result.data.VITE_DATA_SOURCE,
    apiBaseUrl: result.data.VITE_API_BASE_URL.replace(/\/$/, ''),
  }
}

export const env = parseEnv(import.meta.env)
