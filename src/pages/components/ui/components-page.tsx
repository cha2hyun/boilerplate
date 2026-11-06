import { useState } from 'react'
import { ArrowUpRight, Bell, Check, LoaderCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { AvatarGroupCount } from '@/shared/ui/avatar'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { currentDemoUser } from '@/entities/workspace-user'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { RouterTextLink, TextLink } from '@/shared/ui/text-link'

const tokens = [
  {
    name: 'Background',
    className: 'bg-background text-foreground',
    description: 'components.backgroundDescription',
  },
  {
    name: 'Primary',
    className: 'bg-primary text-primary-foreground',
    description: 'components.primaryDescription',
  },
  {
    name: 'Secondary',
    className: 'bg-secondary text-secondary-foreground',
    description: 'components.secondaryDescription',
  },
  {
    name: 'Muted',
    className: 'bg-muted text-muted-foreground',
    description: 'components.mutedDescription',
  },
  {
    name: 'Accent',
    className: 'bg-accent text-accent-foreground',
    description: 'components.accentDescription',
  },
  {
    name: 'Brand · Blueprint Blue',
    className: 'bg-brand text-brand-foreground',
    description: 'components.brandDescription',
  },
] as const
export function ComponentsPage() {
  const { t } = useTranslation('examples')
  const { formatNumber } = useFormatters()
  const [notifications, setNotifications] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [progress, setProgress] = useState(64)
  return (
    <VStack data-slot="page-content" align="stretch" className="min-w-0 gap-6">
      <PageHeader
        title={t('components.title')}
        description={t('components.description')}
        actions={
          <Button asChild variant="outline">
            <a href="https://ui.shadcn.com/docs/components" target="_blank" rel="noreferrer">
              {t('components.explore')}
              <ArrowUpRight />
            </a>
          </Button>
        }
      />
      <Tabs defaultValue="components" className="min-w-0">
        <div
          className="min-w-0 scroll-px-1 overflow-x-auto pb-1"
          onFocusCapture={(event) => {
            event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
          }}
        >
          <TabsList>
            <TabsTrigger value="components">{t('components.componentsTab')}</TabsTrigger>
            <TabsTrigger value="tokens">{t('components.tokensTab')}</TabsTrigger>
            <TabsTrigger value="typography">{t('components.typographyTab')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="components" className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.linksTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.linksDescription')}</CardDescription>
            </CardHeader>
            <HStack asChild wrap className="gap-x-6 gap-y-3 text-sm">
              <CardContent>
                <RouterTextLink to="/projects">{t('components.linkProjects')}</RouterTextLink>
                <RouterTextLink to="/projects" target="_blank">
                  {t('components.linkProjectsNewTab')}
                </RouterTextLink>
                <TextLink href="https://github.com/cha2hyun/boilerplate">GitHub</TextLink>
              </CardContent>
            </HStack>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.actionsTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.actionsDescription')}</CardDescription>
            </CardHeader>
            <HStack asChild wrap className="gap-3">
              <CardContent>
                <Button
                  className="h-auto min-h-9 max-w-full py-1.5 whitespace-normal"
                  onClick={() => toast.success(t('components.primaryToast'))}
                >
                  <Plus />
                  {t('components.primaryAction')}
                </Button>
                <Button
                  className="h-auto min-h-9 max-w-full py-1.5 whitespace-normal"
                  variant="secondary"
                  onClick={() => toast(t('components.secondaryToast'))}
                >
                  {t('components.secondaryAction')}
                </Button>
                <Button
                  className="h-auto min-h-9 max-w-full py-1.5 whitespace-normal"
                  variant="outline"
                  onClick={() => toast.info(t('components.outlineToast'))}
                >
                  {t('components.outlineAction')}
                </Button>
                <Button
                  className="h-auto min-h-9 max-w-full py-1.5 whitespace-normal"
                  variant="ghost"
                  onClick={() => toast(t('components.ghostToast'))}
                >
                  {t('components.ghostAction')}
                </Button>
                <Button className="h-auto min-h-9 max-w-full py-1.5 whitespace-normal" disabled>
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  {t('components.processing')}
                </Button>
              </CardContent>
            </HStack>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.statusTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.statusDescription')}</CardDescription>
            </CardHeader>
            <VStack asChild align="stretch" className="gap-6">
              <CardContent>
                <HStack wrap className="gap-2">
                  <Badge>{t('components.active')}</Badge>
                  <Badge variant="secondary">{t('components.inProgress')}</Badge>
                  <Badge variant="outline">{t('components.draft')}</Badge>
                  <Badge variant="destructive">{t('components.needsAttention')}</Badge>
                </HStack>
                <HStack wrap className="gap-3">
                  <HStack className="-space-x-2">
                    <ProfileAvatar
                      name={currentDemoUser.name}
                      src={currentDemoUser.avatarUrl}
                      className="border-2 border-background"
                      fallbackClassName="text-xs"
                    />
                    {['AK', 'ML'].map((initials) => (
                      <ProfileAvatar
                        key={initials}
                        name=""
                        initials={initials}
                        className="border-2 border-background"
                        fallbackClassName="text-xs"
                      />
                    ))}
                    <AvatarGroupCount className="shrink-0 border-2 border-background text-xs ring-0">
                      {formatNumber(3, { signDisplay: 'always' })}
                    </AvatarGroupCount>
                  </HStack>
                  <span className="text-sm text-muted-foreground">{t('components.together')}</span>
                </HStack>
              </CardContent>
            </VStack>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.inputsTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.inputsDescription')}</CardDescription>
            </CardHeader>
            <VStack asChild align="stretch" className="gap-5">
              <CardContent>
                <VStack align="stretch" className="gap-2">
                  <Label htmlFor="example-name">{t('components.projectName')}</Label>
                  <Input id="example-name" placeholder={t('components.projectPlaceholder')} />
                </VStack>
                <HStack className="gap-2">
                  <Checkbox id="example-terms" />
                  <Label htmlFor="example-terms">{t('components.weeklySummary')}</Label>
                </HStack>
                <HStack justify="between">
                  <Label htmlFor="example-notifications">{t('components.notifications')}</Label>
                  <Switch
                    id="example-notifications"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </HStack>
                <p className="text-xs text-muted-foreground">
                  {t(
                    notifications
                      ? 'components.notificationsEnabled'
                      : 'components.notificationsDisabled',
                  )}
                </p>
              </CardContent>
            </VStack>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.feedbackTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.feedbackDescription')}</CardDescription>
            </CardHeader>
            <VStack asChild align="stretch" className="gap-5">
              <CardContent>
                <Alert>
                  <Check />
                  <AlertTitle className="line-clamp-none">{t('components.upToDate')}</AlertTitle>
                  <AlertDescription>{t('components.workspaceReady')}</AlertDescription>
                </Alert>
                <HStack wrap className="gap-3">
                  <Button
                    className="h-auto min-h-9 max-w-full py-1.5 whitespace-normal"
                    variant="outline"
                    onClick={() =>
                      toast.success(t('components.changesSaved'), {
                        description: t('components.savedDescription'),
                      })
                    }
                  >
                    <Bell />
                    {t('components.showNotification')}
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="h-auto min-h-9 max-w-full py-1.5 whitespace-normal"
                        variant="outline"
                      >
                        {t('components.openDialog')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('components.dialogTitle')}</DialogTitle>
                        <DialogDescription>{t('components.dialogDescription')}</DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setDialogOpen(false)
                          }}
                        >
                          {t('components.gotIt')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </HStack>
              </CardContent>
            </VStack>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.progressTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.progressDescription')}</CardDescription>
            </CardHeader>
            <VStack asChild align="stretch" className="gap-4">
              <CardContent>
                <HStack justify="between" className="text-sm">
                  <span>{t('components.workspaceSetup')}</span>
                  <span className="tabular-nums">
                    {formatNumber(progress, { style: 'percent', maximumFractionDigits: 0 })}
                  </span>
                </HStack>
                <Progress value={progress} aria-label={t('components.workspaceSetup')} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-8 max-w-full self-start py-1 whitespace-normal"
                  onClick={() => {
                    setProgress((value) => (value >= 100 ? 0 : Math.min(100, value + 12)))
                  }}
                >
                  {progress >= 100
                    ? t('components.resetProgress')
                    : t('components.advanceProgress')}
                </Button>
              </CardContent>
            </VStack>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.loadingTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.loadingDescription')}</CardDescription>
            </CardHeader>
            <HStack asChild className="gap-4">
              <CardContent>
                <Skeleton className="size-12 rounded-full" />
                <VStack align="stretch" className="flex-1 gap-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </VStack>
              </CardContent>
            </HStack>
          </Card>
        </TabsContent>
        <TabsContent value="tokens" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>{t('components.colorsTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('components.colorsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {tokens.map((token) => (
                <VStack align="stretch" key={token.name} className="gap-2">
                  <HStack
                    justify="center"
                    className={`${token.className} h-24 rounded-lg border text-2xl font-semibold`}
                  >
                    Aa
                  </HStack>
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-xs text-muted-foreground">{t(token.description)}</p>
                </VStack>
              ))}
            </CardContent>
          </Card>
          <Alert className="mt-5">
            <Check />
            <AlertTitle className="line-clamp-none">{t('components.colorRoleTitle')}</AlertTitle>
            <AlertDescription>{t('components.colorRoleDescription')}</AlertDescription>
          </Alert>
        </TabsContent>
        <VStack asChild align="stretch" className="mt-6 gap-5">
          <TabsContent value="typography">
            <Card>
              <CardHeader>
                <CardTitle asChild>
                  <h2>{t('components.weightsTitle')}</h2>
                </CardTitle>
                <CardDescription>{t('components.weightsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-3">
                {[
                  {
                    weight: '400',
                    name: 'Regular',
                    className: 'font-normal',
                    role: t('components.regularRole'),
                  },
                  {
                    weight: '500',
                    name: 'Medium',
                    className: 'font-medium',
                    role: t('components.mediumRole'),
                  },
                  {
                    weight: '600',
                    name: 'SemiBold',
                    className: 'font-semibold',
                    role: t('components.semiboldRole'),
                  },
                ].map((type) => (
                  <VStack align="stretch" key={type.weight} className="gap-3">
                    <Badge variant="outline" className="self-start">
                      {type.weight} · {type.name}
                    </Badge>
                    <p
                      data-testid={`type-sample-${type.weight}`}
                      className={`${type.className} text-2xl`}
                    >
                      <span lang="ko">명확한 시작, 더 나은 제품.</span>
                      <br />
                      <span lang="en">Build with clarity.</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{type.role}</p>
                  </VStack>
                ))}
              </CardContent>
            </Card>
            <Alert>
              <Check />
              <AlertTitle className="line-clamp-none">{t('components.hierarchyTitle')}</AlertTitle>
              <AlertDescription>{t('components.hierarchyDescription')}</AlertDescription>
            </Alert>
          </TabsContent>
        </VStack>
      </Tabs>
    </VStack>
  )
}
