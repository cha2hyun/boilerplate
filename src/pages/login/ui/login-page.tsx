import { useId, useRef, useState, type SubmitEvent } from 'react'
import { Boxes, Globe } from 'lucide-react'
import {
  demoCredentials,
  signInDemoAccount,
  signInWithMicrosoftDemo,
  type DemoCredentialErrors,
} from '@/features/demo-session'
import { product } from '@/shared/config/product'
import { useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { Separator } from '@/shared/ui/separator'
import { HStack, VStack } from '@/shared/ui/stack'
import { RouterTextLink } from '@/shared/ui/text-link'
import microsoftSymbol from '../assets/microsoft-symbol.svg'

const noErrors: DemoCredentialErrors = { email: null, password: null }

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation('demoLogin')
  const locale = useLocalePreferences((state) => state.locale)
  const setLocale = useLocalePreferences((state) => state.setLocale)
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
    <VStack
      asChild
      align="stretch"
      justify="center"
      className="mx-auto min-h-svh w-full max-w-md min-w-0 gap-6 px-4 py-8 sm:px-6"
    >
      <main id="main-content" data-slot="page-content" tabIndex={-1}>
        <HStack wrap justify="between" className="gap-3 px-1">
          <HStack className="min-w-0 gap-2">
            <HStack
              justify="center"
              className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground"
            >
              <Boxes className="size-5" aria-hidden="true" />
            </HStack>
            <span className="text-lg font-semibold tracking-tight wrap-anywhere">
              {product.wordmark}
              <span className="text-muted-foreground">.</span>
            </span>
          </HStack>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('language')}>
                <Globe aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={locale}
                onValueChange={(value) => {
                  if (value === 'ko-KR' || value === 'en-US') setLocale(value)
                }}
              >
                <DropdownMenuRadioItem value="ko-KR" lang="ko">
                  한국어
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en-US" lang="en">
                  English
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </HStack>
        <Card className="min-w-0 shadow-xs">
          <CardHeader className="grid-cols-1 px-4 sm:px-6">
            <PageHeader title={t('title')} description={t('description')} />
          </CardHeader>
          <VStack asChild align="stretch" className="min-w-0 gap-6 px-4 sm:px-6">
            <CardContent>
              <VStack asChild align="stretch" className="min-w-0 gap-4">
                <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                  <VStack align="stretch" className="min-w-0 gap-2">
                    <Label htmlFor={`${formId}-email`}>{t('email')}</Label>
                    <Input
                      id={`${formId}-email`}
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
                  <Button type="submit" className="h-auto min-h-9 w-full whitespace-normal">
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
                className="h-auto min-h-9 w-full whitespace-normal"
                onClick={() => {
                  signInWithMicrosoftDemo()
                  setPassword('')
                  onSignedIn()
                }}
              >
                <img src={microsoftSymbol} className="size-5 shrink-0" alt="" />
                {t('microsoft')}
              </Button>
            </CardContent>
          </VStack>
        </Card>
        <p className="text-center text-sm">
          <RouterTextLink to="/">{t('browseDashboard')}</RouterTextLink>
        </p>
      </main>
    </VStack>
  )
}
