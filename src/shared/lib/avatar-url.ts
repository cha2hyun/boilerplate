import { z } from 'zod'

/** Preserve the profile when its optional photo is absent or cannot be used. */
export const avatarUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    if (/[\\\s]/u.test(value)) return false
    if (/^\/(?!\/)/u.test(value)) return true
    if (!/^https:\/\/[^/]/iu.test(value)) return false
    try {
      const url = new URL(value)
      return !url.username && !url.password
    } catch {
      return false
    }
  })
  .optional()
  .catch(undefined)
