import { z } from 'zod'
import { currentDemoUser } from '@/entities/workspace-user'

/** Keep public demo credentials off configured business API origins. */
export const demoLoginPath = '/api/demo-login'
export const demoCredentials = {
  email: currentDemoUser.email,
  password: 'Blueprint123!',
} as const
export const demoSessionSchema = z.strictObject({ id: z.literal(currentDemoUser.id) })
export type DemoSession = z.infer<typeof demoSessionSchema>

const scenarioSchema = z.enum(['success', 'slow', 'failure'])
export type DemoLoginScenario = z.infer<typeof scenarioSchema>
export const demoLoginRequestSchema = z.discriminatedUnion('method', [
  z.strictObject({
    method: z.literal('credentials'),
    scenario: scenarioSchema,
    email: z.string().trim().toLowerCase(),
    password: z.string(),
  }),
  z.strictObject({ method: z.literal('microsoft'), scenario: scenarioSchema }),
])
export type DemoLoginRequest = z.infer<typeof demoLoginRequestSchema>

const emailFormat = z.email()
const fieldErrors = z.strictObject({
  email: z.enum(['emailRequired', 'emailInvalid', 'useDemoEmail']).nullable(),
  password: z.enum(['passwordRequired', 'useDemoPassword']).nullable(),
})
export type DemoCredentialErrors = z.infer<typeof fieldErrors>
export const rejectedCredentialsSchema = z.strictObject({
  code: z.literal('invalid_credentials'),
  errors: fieldErrors.refine(({ email, password }) => email !== null || password !== null),
})
export const unavailableLoginSchema = z.strictObject({ code: z.literal('unavailable') })
export const invalidLoginRequestSchema = z.strictObject({ code: z.literal('invalid_request') })

/** Only required fields and address syntax are checked before the HTTP request. */
export function validateRequiredDemoCredentials(
  email: string,
  password: string,
): DemoCredentialErrors {
  return {
    email: !email.trim()
      ? 'emailRequired'
      : emailFormat.safeParse(email.trim()).success
        ? null
        : 'emailInvalid',
    password: password ? null : 'passwordRequired',
  }
}

/** The mock endpoint compares both fields and never echoes submitted values. */
export function checkDemoCredentials(email: string, password: string): DemoCredentialErrors {
  const errors = validateRequiredDemoCredentials(email, password)
  if (!errors.email && email.trim().toLowerCase() !== demoCredentials.email)
    errors.email = 'useDemoEmail'
  if (!errors.password && password !== demoCredentials.password) errors.password = 'useDemoPassword'
  return errors
}
