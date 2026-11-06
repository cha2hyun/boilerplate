import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  demoCredentials,
  signInDemoAccount,
  signInWithMicrosoftDemo,
  validateRequiredDemoCredentials,
  type DemoCredentialErrors,
  type DemoLoginScenario,
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
import { DemoResponseMenu } from './demo-response-menu'
import { LoginHeader } from './login-header'
import { LoginWorkspacePreview } from './login-workspace-preview'

const noErrors: DemoCredentialErrors = { email: null, password: null }

type LoginMethod = 'credentials' | 'microsoft'

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation('demoLogin')
  const router = useRouter()
  const formId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState<string>(demoCredentials.email)
  const [password, setPassword] = useState<string>(demoCredentials.password)
  const [errors, setErrors] = useState(noErrors)
  const [scenario, setScenario] = useState<DemoLoginScenario>('success')
  const [pending, setPending] = useState<LoginMethod | null>(null)
  const [serviceFailure, setServiceFailure] = useState<LoginMethod | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const activeRequest = useRef<AbortController | null>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const microsoftRef = useRef<HTMLButtonElement>(null)
  const locked = pending !== null || signedIn
  const pendingLabel = pending === 'microsoft' ? t('microsoftPending') : t('pending')

  useEffect(() => {
    function cancelAttempt() {
      if (!activeRequest.current) return
      activeRequest.current.abort()
      activeRequest.current = null
      setPending(null)
      setScenario('success')
    }
    // A pending route loader or a cached browser document can keep this page mounted.
    const unsubscribe = router.subscribe('onBeforeNavigate', ({ pathChanged }) => {
      if (pathChanged) cancelAttempt()
    })
    window.addEventListener('pagehide', cancelAttempt)
    return () => {
      unsubscribe()
      window.removeEventListener('pagehide', cancelAttempt)
      activeRequest.current?.abort()
    }
  }, [router])

  function showFieldErrors(nextErrors: DemoCredentialErrors) {
    setErrors(nextErrors)
    const target = nextErrors.email ? emailRef : passwordRef
    requestAnimationFrame(() => {
      if (target.current?.getAttribute('aria-invalid') === 'true') target.current.focus()
    })
  }

  async function signIn(method: LoginMethod) {
    if (activeRequest.current || signedIn) return
    setServiceFailure(null)
    if (method === 'credentials') {
      const required = validateRequiredDemoCredentials(email, password)
      if (required.email || required.password) {
        showFieldErrors(required)
        return
      }
    }
    setErrors(noErrors)
    const controller = new AbortController()
    activeRequest.current = controller
    const options = { scenario, signal: controller.signal }
    setPending(method)
    let result
    try {
      result =
        method === 'credentials'
          ? await signInDemoAccount(email, password, options)
          : await signInWithMicrosoftDemo(options)
    } catch {
      if (!controller.signal.aborted) {
        setServiceFailure(method)
        const trigger = method === 'credentials' ? submitRef : microsoftRef
        requestAnimationFrame(() => trigger.current?.focus())
      }
      return
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null
      if (!controller.signal.aborted) {
        setPending(null)
        setScenario('success')
      }
    }
    if (controller.signal.aborted) return
    if (!result.ok) {
      showFieldErrors(result.errors)
      return
    }
    setSignedIn(true)
    setPassword('')
    toast.success(t('signedIn'))
    onSignedIn()
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    void signIn('credentials')
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
                    readOnly={locked}
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
                    readOnly={locked}
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
                <Button
                  ref={submitRef}
                  type="submit"
                  className="h-auto min-h-11 w-full whitespace-normal"
                  disabled={locked}
                  aria-busy={pending === 'credentials'}
                  aria-describedby={
                    serviceFailure === 'credentials' ? `${formId}-server-error` : undefined
                  }
                >
                  {pending === 'credentials' && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                    />
                  )}
                  {pending === 'credentials' ? pendingLabel : t('submit')}
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
              ref={microsoftRef}
              disabled={locked}
              aria-busy={pending === 'microsoft'}
              aria-describedby={
                serviceFailure === 'microsoft' ? `${formId}-server-error` : undefined
              }
              onClick={() => void signIn('microsoft')}
            >
              {pending === 'microsoft' ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-5 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <img src={microsoftSymbol} className="size-5 shrink-0" alt="" />
              )}
              {pending === 'microsoft' ? pendingLabel : t('microsoft')}
            </Button>
            <p role="status" className="sr-only">
              {pending ? pendingLabel : ''}
            </p>
            {serviceFailure && (
              <p
                role="alert"
                id={`${formId}-server-error`}
                className="text-sm wrap-anywhere text-destructive"
              >
                {t('serviceError')}
              </p>
            )}
          </VStack>
          <HStack wrap justify="between" className="min-w-0 gap-2 text-sm">
            <RouterTextLink to="/">{t('browseDashboard')}</RouterTextLink>
            <DemoResponseMenu value={scenario} onChange={setScenario} disabled={locked} />
          </HStack>
        </VStack>
        <LoginWorkspacePreview />
      </main>
    </VStack>
  )
}
