import { product } from '@/shared/config/product'
import { useRef, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { preferencesSchema, usePreferences } from '@/features/workspace-preferences'
import { useUnsavedChanges } from '@/shared/hooks/use-unsaved-changes'
import { useTranslation } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/lib/theme'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import { PageHeader } from '@/shared/ui/page-header'
import { HStack, VStack } from '@/shared/ui/stack'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { UnsavedChangesDialog } from '@/shared/ui/unsaved-changes-dialog'

export function SettingsPage() {
  const { t } = useTranslation('workspace')
  const { theme, setTheme } = useTheme()
  const preferences = usePreferences()
  const [workspaceName, setWorkspaceName] = useState(preferences.workspaceName)
  const [compactMode, setCompactMode] = useState(preferences.compactMode)
  const [error, setError] = useState<'settings.nameTooShort' | 'settings.nameTooLong'>()
  const dirty =
    workspaceName !== preferences.workspaceName || compactMode !== preferences.compactMode
  const nameRef = useRef<HTMLInputElement>(null)
  const generalTabRef = useRef<HTMLButtonElement>(null)
  const protection = useUnsavedChanges({
    dirty,
    focusRef: nameRef,
    fallbackFocusRef: generalTabRef,
  })
  return (
    <VStack data-slot="page-content" align="stretch" className="max-w-4xl min-w-0 gap-6">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" ref={generalTabRef}>
            {t('settings.general')}
          </TabsTrigger>
          <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const result = preferencesSchema.safeParse({ workspaceName, compactMode })
              if (!result.success) {
                setError(
                  workspaceName.trim().length < 2
                    ? 'settings.nameTooShort'
                    : 'settings.nameTooLong',
                )
                return
              }
              preferences.save(result.data)
              setWorkspaceName(result.data.workspaceName)
              setError(undefined)
              protection.markSaved()
              toast.success(t('settings.updated'))
            }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.preferences')}</CardTitle>
                <CardDescription>{t('settings.savedInBrowser')}</CardDescription>
              </CardHeader>
              <VStack asChild align="stretch" className="gap-6">
                <CardContent>
                  <VStack align="stretch" className="max-w-md gap-2">
                    <Label htmlFor="workspace-name">{t('settings.workspaceName')}</Label>
                    <Input
                      id="workspace-name"
                      ref={nameRef}
                      value={workspaceName}
                      onChange={(event) => {
                        setWorkspaceName(event.target.value)
                        setError(undefined)
                      }}
                      aria-invalid={!!error}
                      aria-describedby={error ? 'workspace-error' : 'workspace-hint'}
                      maxLength={40}
                    />
                    <p id="workspace-hint" className="text-xs text-muted-foreground">
                      {t('settings.workspaceHint')}
                    </p>
                    {error && (
                      <p id="workspace-error" role="alert" className="text-sm text-destructive">
                        {t(error)}
                      </p>
                    )}
                  </VStack>
                  <Separator />
                  <HStack justify="between" className="gap-5">
                    <VStack align="stretch" className="gap-1">
                      <Label htmlFor="compact-mode">{t('settings.compact')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.compactDescription')}
                      </p>
                    </VStack>
                    <Switch
                      id="compact-mode"
                      checked={compactMode}
                      onCheckedChange={setCompactMode}
                    />
                  </HStack>
                </CardContent>
              </VStack>
              <VStack
                asChild
                align="stretch"
                className="gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <CardFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-h-9 py-1.5 whitespace-normal"
                    onClick={() => {
                      const resetPreferences = preferences.reset()
                      setWorkspaceName(resetPreferences.workspaceName)
                      setCompactMode(resetPreferences.compactMode)
                      setError(undefined)
                      protection.markSaved()
                      toast.success(t('settings.resetToast'))
                    }}
                  >
                    {t('settings.reset')}
                  </Button>
                  <Button
                    type="submit"
                    className="h-auto min-h-9 py-1.5 whitespace-normal"
                    disabled={!dirty}
                  >
                    {t('common.save')}
                  </Button>
                </CardFooter>
              </VStack>
            </Card>
          </form>
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance')}</CardTitle>
              <CardDescription>
                {t('settings.chooseAppearance', { product: product.name })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  {
                    value: 'light' as const,
                    label: t('settings.light'),
                    icon: Sun,
                    description: t('settings.lightDescription'),
                  },
                  {
                    value: 'dark' as const,
                    label: t('settings.dark'),
                    icon: Moon,
                    description: t('settings.darkDescription'),
                  },
                  {
                    value: 'system' as const,
                    label: t('settings.system'),
                    icon: Monitor,
                    description: t('settings.systemDescription'),
                  },
                ].map((option) => (
                  <VStack asChild key={option.value} align="start" className="h-auto gap-3 p-5">
                    <Button
                      className="min-w-0 text-start whitespace-normal"
                      variant={theme === option.value ? 'secondary' : 'outline'}
                      onClick={() => {
                        setTheme(option.value)
                      }}
                      aria-pressed={theme === option.value}
                    >
                      <option.icon className="size-6" />
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    </Button>
                  </VStack>
                ))}
              </div>
              <p className="mt-5 text-xs text-muted-foreground">{t('settings.immediate')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <UnsavedChangesDialog {...protection.dialogProps} />
    </VStack>
  )
}
