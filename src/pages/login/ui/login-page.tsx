import { useId, useRef, useState, type SubmitEvent } from 'react'
import {
  demoCredentials,
  signInDemoAccount,
  signInWithMicrosoftDemo,
  type DemoCredentialErrors,
} from '@/features/demo-session'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { Separator } from '@/shared/ui/separator'
import { HStack, VStack } from '@/shared/ui/stack'
import { RouterTextLink } from '@/shared/ui/text-link'
import microsoftSymbol from '../assets/microsoft-symbol.svg'
import { LoginHeader } from './login-header'
import { LoginWorkspacePreview } from './login-workspace-preview'

const noErrors: DemoCredentialErrors = { email: null, password: null }

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation('demoLogin')
  const formId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState<string>(demoCredentials.email)
  const [password, setPassword] = useState<string>(demoCredentials.password)
  const [errors, setErrors] = useState(noErrors)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = signInDemoAccount(email, password)
    if (!result.ok) {
      setErrors(result.errors)
      const target = result.errors.email ? emailRef : passwordRef
      requestAnimationFrame(() => {
        if (target.current?.getAttribute('aria-invalid') === 'true') target.current.focus()
      })
      return
    }
    setPassword('')
    onSignedIn()
  }

  return (
    <VStack align="stretch" className="min-h-svh min-w-0">
      <LoginHeader />
      <main
        id="main-content"
        data-slot="page-content"
        tabIndex={-1}
        className="grid w-full min-w-0 flex-1 grid-cols-[minmax(0,1fr)] items-center gap-6 px-[clamp(1rem,5vw,5rem)] py-[clamp(2rem,5vw,5rem)] xl:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] xl:gap-[clamp(1.5rem,3vw,3.5rem)]"
      >
        <VStack align="stretch" className="mx-auto w-full max-w-sm min-w-0 gap-6">
          <PageHeader title={t('title')} description={t('description')} />
          <VStack align="stretch" className="min-w-0 gap-4">
            <VStack asChild align="stretch" className="min-w-0 gap-4">
              <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                <VStack align="stretch" className="min-w-0 gap-2">
                  <Label htmlFor={`${formId}-email`}>{t('email')}</Label>
                  <Input
                    id={`${formId}-email`}
                    className="min-h-11"
                    ref={emailRef}
                    type="email"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setErrors((previous) => ({ ...previous, email: null }))
                    }}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? `${formId}-email-error` : undefined}
                  />
                  {errors.email && (
                    <p
                      role="alert"
                      id={`${formId}-email-error`}
                      className="text-sm wrap-anywhere text-destructive"
                    >
                      {t(errors.email)}
                    </p>
                  )}
                </VStack>
                <VStack align="stretch" className="min-w-0 gap-2">
                  <Label htmlFor={`${formId}-password`}>{t('password')}</Label>
                  <Input
                    id={`${formId}-password`}
                    className="min-h-11"
                    ref={passwordRef}
                    type="password"
                    autoComplete="off"
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setErrors((previous) => ({ ...previous, password: null }))
                    }}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? `${formId}-password-error` : undefined}
                  />
                  {errors.password && (
                    <p
                      role={errors.email ? undefined : 'alert'}
                      id={`${formId}-password-error`}
                      className="text-sm wrap-anywhere text-destructive"
                    >
                      {t(errors.password)}
                    </p>
                  )}
                </VStack>
                <Button type="submit" className="h-auto min-h-11 w-full whitespace-normal">
                  {t('submit')}
                </Button>
              </form>
            </VStack>
            <HStack className="gap-3 text-xs text-muted-foreground">
              <Separator className="min-w-0 flex-1" />
              <span>{t('or')}</span>
              <Separator className="min-w-0 flex-1" />
            </HStack>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-11 w-full whitespace-normal"
              onClick={() => {
                signInWithMicrosoftDemo()
                setPassword('')
                onSignedIn()
              }}
            >
              <img src={microsoftSymbol} className="size-5 shrink-0" alt="" />
              {t('microsoft')}
            </Button>
          </VStack>
          <p className="text-start text-sm">
            <RouterTextLink to="/">{t('browseDashboard')}</RouterTextLink>
          </p>
        </VStack>
        <LoginWorkspacePreview />
      </main>
    </VStack>
  )
}
