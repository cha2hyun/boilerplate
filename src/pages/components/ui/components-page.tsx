import { useState } from 'react'
import { ArrowUpRight, Bell, Check, LoaderCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
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
import { Skeleton } from '@/shared/ui/skeleton'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

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
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('components.title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('components.description')}</p>
        </div>
        <Button asChild variant="outline">
          <a href="https://ui.shadcn.com/docs/components" target="_blank" rel="noreferrer">
            {t('components.explore')}
            <ArrowUpRight />
          </a>
        </Button>
      </div>
      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">{t('components.componentsTab')}</TabsTrigger>
          <TabsTrigger value="tokens">{t('components.tokensTab')}</TabsTrigger>
          <TabsTrigger value="typography">{t('components.typographyTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="mt-6 grid items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('components.actionsTitle')}</CardTitle>
              <CardDescription>{t('components.actionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button onClick={() => toast.success(t('components.primaryToast'))}>
                <Plus />
                {t('components.primaryAction')}
              </Button>
              <Button variant="secondary" onClick={() => toast(t('components.secondaryToast'))}>
                {t('components.secondaryAction')}
              </Button>
              <Button variant="outline" onClick={() => toast.info(t('components.outlineToast'))}>
                {t('components.outlineAction')}
              </Button>
              <Button variant="ghost" onClick={() => toast(t('components.ghostToast'))}>
                {t('components.ghostAction')}
              </Button>
              <Button disabled>
                <LoaderCircle className="animate-spin" />
                {t('components.processing')}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('components.statusTitle')}</CardTitle>
              <CardDescription>{t('components.statusDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge>{t('components.active')}</Badge>
                <Badge variant="secondary">{t('components.inProgress')}</Badge>
                <Badge variant="outline">{t('components.draft')}</Badge>
                <Badge variant="destructive">{t('components.needsAttention')}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['JD', 'AK', 'ML', 3].map((name) => (
                    <Avatar key={name} className="border-2 border-background">
                      <AvatarFallback className="text-xs">
                        {typeof name === 'number'
                          ? formatNumber(name, { signDisplay: 'always' })
                          : name}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{t('components.together')}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('components.inputsTitle')}</CardTitle>
              <CardDescription>{t('components.inputsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="example-name">{t('components.projectName')}</Label>
                <Input id="example-name" placeholder={t('components.projectPlaceholder')} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="example-terms" />
                <Label htmlFor="example-terms">{t('components.weeklySummary')}</Label>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="example-notifications">{t('components.notifications')}</Label>
                <Switch
                  id="example-notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  notifications
                    ? 'components.notificationsEnabled'
                    : 'components.notificationsDisabled',
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('components.feedbackTitle')}</CardTitle>
              <CardDescription>{t('components.feedbackDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Alert>
                <Check />
                <AlertTitle>{t('components.upToDate')}</AlertTitle>
                <AlertDescription>{t('components.workspaceReady')}</AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-3">
                <Button
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
                    <Button variant="outline">{t('components.openDialog')}</Button>
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
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('components.progressTitle')}</CardTitle>
              <CardDescription>{t('components.progressDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{t('components.workspaceSetup')}</span>
                <span className="tabular-nums">
                  {formatNumber(progress, { style: 'percent', maximumFractionDigits: 0 })}
                </span>
              </div>
              <Progress value={progress} aria-label={t('components.workspaceSetup')} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProgress((value) => (value >= 100 ? 0 : Math.min(100, value + 12)))
                }}
              >
                {progress >= 100 ? t('components.resetProgress') : t('components.advanceProgress')}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('components.loadingTitle')}</CardTitle>
              <CardDescription>{t('components.loadingDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tokens" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('components.colorsTitle')}</CardTitle>
              <CardDescription>{t('components.colorsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {tokens.map((token) => (
                <div key={token.name} className="space-y-2">
                  <div
                    className={`${token.className} flex h-24 items-center justify-center rounded-lg border text-2xl font-semibold`}
                  >
                    Aa
                  </div>
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-xs text-muted-foreground">{t(token.description)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Alert className="mt-5">
            <Check />
            <AlertTitle>{t('components.colorRoleTitle')}</AlertTitle>
            <AlertDescription>{t('components.colorRoleDescription')}</AlertDescription>
          </Alert>
        </TabsContent>
        <TabsContent value="typography" className="mt-6 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('components.weightsTitle')}</CardTitle>
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
                <div key={type.weight} className="space-y-3">
                  <Badge variant="outline">
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
                </div>
              ))}
            </CardContent>
          </Card>
          <Alert>
            <Check />
            <AlertTitle>{t('components.hierarchyTitle')}</AlertTitle>
            <AlertDescription>{t('components.hierarchyDescription')}</AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
