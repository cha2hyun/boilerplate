import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  CircleAlert,
  Folder,
  Gauge,
  Globe,
  Inbox,
  LayoutDashboard,
  RotateCcw,
  Settings,
} from 'lucide-react'
import { NumberDisplay } from '@/features/number-motion'
import { formatNumber as formatPreviewNumber, type NumberFormatOptions } from '@/shared/lib/format'
import { useFormatters, useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { MetricCard } from '@/shared/ui/metric-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

const railItems = [
  { id: 'dashboard', label: 'foundations.railDashboard', icon: LayoutDashboard },
  { id: 'inbox', label: 'foundations.railInbox', icon: Inbox },
  { id: 'settings', label: 'foundations.railSettings', icon: Settings },
] as const
const sampleTimestamp = new Date('2026-11-04T06:30:00Z')

function BasicsExamples() {
  const { t } = useTranslation('examples')
  const { formatNumber } = useFormatters()
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.typeTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.typeDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-6">
          <CardContent>
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {t('foundations.typeSampleTitle')}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t('foundations.typeSampleDescription')}
              </p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-4 text-sm">
              <dt className="text-muted-foreground">{formatNumber(400)} · Regular</dt>
              <dd className="font-normal">{t('foundations.regularRole')}</dd>
              <dt className="text-muted-foreground">{formatNumber(500)} · Medium</dt>
              <dd className="font-medium">{t('foundations.mediumRole')}</dd>
              <dt className="text-muted-foreground">{formatNumber(600)} · SemiBold</dt>
              <dd className="font-semibold">{t('foundations.semiboldRole')}</dd>
            </dl>
          </CardContent>
        </VStack>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.colorTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.colorDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-4">
          <CardContent>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-lg bg-primary p-4 text-primary-foreground">
                <p className="text-sm font-medium">Primary</p>
                <p className="mt-1 text-xs">{t('foundations.primaryRole')}</p>
              </div>
              <div className="rounded-lg bg-brand p-4 text-brand-foreground">
                <p className="text-sm font-medium">Blueprint Blue</p>
                <p className="mt-1 text-xs">{t('foundations.brandRole')}</p>
              </div>
            </div>
            <HStack wrap className="gap-2">
              <Badge>
                <Check aria-hidden="true" />
                {t('foundations.complete')}
              </Badge>
              <Badge variant="secondary">{t('foundations.inProgress')}</Badge>
              <Badge variant="outline">{t('foundations.draft')}</Badge>
            </HStack>
            <p className="text-sm leading-6 text-muted-foreground">{t('foundations.statusHelp')}</p>
          </CardContent>
        </VStack>
      </Card>
      <Card className="min-w-0 md:col-span-2">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.compositionTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.compositionDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['shadcn UI', t('foundations.shadcnDescription')],
            ['Tailwind', t('foundations.tailwindDescription')],
            [t('foundations.accessibility'), t('foundations.accessibilityDescription')],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border p-4">
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function LayoutExamples() {
  const { t } = useTranslation('examples')
  const { formatNumber } = useFormatters()
  const [railSelection, setRailSelection] = useState<(typeof railItems)[number]>(railItems[0])
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <HStack asChild className="gap-2">
              <h2>
                <ArrowRight className="size-4" aria-hidden="true" />
                {t('foundations.horizontalTitle')}
              </h2>
            </HStack>
          </CardTitle>
          <CardDescription>{t('foundations.horizontalDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-4">
          <CardContent>
            <HStack wrap className="gap-3 rounded-lg border p-4">
              <Folder className="size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-sm font-medium wrap-anywhere">{t('foundations.reportName')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('foundations.reportDescription')}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {t('foundations.draft')}
              </Badge>
            </HStack>
            <code className="rounded-md bg-muted p-3 text-xs leading-5 break-words text-muted-foreground">
              {'<HStack className="gap-3">'} · min-w-0 flex-1 · shrink-0
            </code>
            <p className="text-sm leading-6 text-muted-foreground">
              {t('foundations.alignmentHelp')}
            </p>
          </CardContent>
        </VStack>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <HStack asChild className="gap-2">
              <h2>
                <ArrowDown className="size-4" aria-hidden="true" />
                {t('foundations.verticalTitle')}
              </h2>
            </HStack>
          </CardTitle>
          <CardDescription>{t('foundations.verticalDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-4">
          <CardContent>
            <VStack align="start" className="gap-3 rounded-lg border p-4">
              <p className="text-sm font-medium">{t('foundations.launchTitle')}</p>
              <p className="text-sm leading-6 text-muted-foreground">
                {t('foundations.launchDescription')}
              </p>
              <HStack wrap className="gap-2">
                <Badge variant="secondary">{t('foundations.designReview')}</Badge>
                <Badge variant="outline">{t('foundations.copyReview')}</Badge>
                <Badge variant="outline">{t('foundations.accessibilityReview')}</Badge>
              </HStack>
            </VStack>
            <code className="rounded-md bg-muted p-3 text-xs leading-5 break-words text-muted-foreground">
              {'<VStack align="start" className="gap-3">'} · {'<HStack wrap>'}
            </code>
          </CardContent>
        </VStack>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.railTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.railDescription')}</CardDescription>
        </CardHeader>
        <HStack asChild wrap className="gap-6">
          <CardContent>
            <VStack
              className="w-14 shrink-0 gap-2 rounded-lg border bg-muted/30 py-3"
              aria-label={t('foundations.railLabel')}
            >
              {railItems.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant={railSelection.id === item.id ? 'secondary' : 'ghost'}
                      aria-label={t(item.label)}
                      aria-pressed={railSelection.id === item.id}
                      onClick={() => {
                        setRailSelection(item)
                      }}
                    >
                      <item.icon className="shrink-0" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t(item.label)}</TooltipContent>
                </Tooltip>
              ))}
            </VStack>
            <VStack align="stretch" className="min-w-0 flex-1 basis-40 gap-2">
              <p className="text-sm font-medium" aria-live="polite">
                {t('foundations.railSelected', { label: t(railSelection.label) })}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{t('foundations.railHelp')}</p>
              <code className="text-xs break-words text-muted-foreground">
                {'<VStack> · <HStack justify="center">'}
              </code>
            </VStack>
          </CardContent>
        </HStack>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.breakpointsTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.breakpointsDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-4">
          <CardContent>
            <VStack asChild align="stretch" className="gap-3 text-sm">
              <dl>
                <HStack justify="between" className="gap-3">
                  <dt>{t('foundations.mobile')}</dt>
                  <dd className="text-muted-foreground">
                    {t('foundations.mobileRange', {
                      width: formatNumber(768),
                      columns: formatNumber(1),
                    })}
                  </dd>
                </HStack>
                <HStack justify="between" className="gap-3">
                  <dt>{t('foundations.tablet')}</dt>
                  <dd className="text-muted-foreground">
                    {t('foundations.tabletRange', {
                      width: formatNumber(768),
                      min: formatNumber(1),
                      max: formatNumber(2),
                    })}
                  </dd>
                </HStack>
                <HStack justify="between" className="gap-3">
                  <dt>{t('foundations.desktop')}</dt>
                  <dd className="text-muted-foreground">
                    {t('foundations.desktopRange', {
                      width: formatNumber(1280),
                      min: formatNumber(2),
                      max: formatNumber(4),
                    })}
                  </dd>
                </HStack>
              </dl>
            </VStack>
            <code className="block rounded-md bg-muted p-3 text-xs leading-5 break-words text-muted-foreground">
              grid gap-4 md:grid-cols-2 xl:grid-cols-3
            </code>
            <p className="text-sm leading-6 text-muted-foreground">
              {t('foundations.breakpointsHelp')}
            </p>
          </CardContent>
        </VStack>
      </Card>
    </div>
  )
}

function ContentExamples() {
  const { t } = useTranslation('examples')
  const globalLocale = useLocalePreferences((state) => state.locale)
  const [previewLocale, setPreviewLocale] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState('UTC')
  const locale = previewLocale ?? globalLocale
  const { formatDate } = useFormatters()
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.writingTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.writingDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-5">
          <CardContent>
            {[
              [
                t('foundations.actionLabel'),
                t('foundations.actionExample'),
                t('foundations.actionHelp'),
              ],
              [
                t('foundations.successLabel'),
                t('foundations.successExample'),
                t('foundations.successHelp'),
              ],
              [
                t('foundations.errorLabel'),
                t('foundations.errorExample'),
                t('foundations.errorHelp'),
              ],
              [
                t('foundations.emptyLabel'),
                t('foundations.emptyExample'),
                t('foundations.emptyHelp'),
              ],
            ].map(([label, example, description]) => (
              <HStack key={label} wrap className="gap-3">
                <Badge variant="outline" className="shrink-0">
                  {label}
                </Badge>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="text-sm leading-6 font-medium">{example}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                </div>
              </HStack>
            ))}
          </CardContent>
        </VStack>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <HStack asChild className="gap-2">
              <h2>
                <Globe className="size-4" aria-hidden="true" />
                {t('foundations.localeTitle')}
              </h2>
            </HStack>
          </CardTitle>
          <CardDescription>{t('foundations.localeDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-5">
          <CardContent>
            <div className="grid gap-3 xl:grid-cols-2">
              <VStack align="stretch" className="gap-2">
                <Label htmlFor="foundation-locale">{t('foundations.previewLocale')}</Label>
                <Select value={locale} onValueChange={setPreviewLocale}>
                  <SelectTrigger id="foundation-locale" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko-KR">{t('foundations.korean')}</SelectItem>
                    <SelectItem value="en-US">{t('foundations.english')}</SelectItem>
                    <SelectItem value="de-DE">{t('foundations.german')}</SelectItem>
                  </SelectContent>
                </Select>
              </VStack>
              <VStack align="stretch" className="gap-2">
                <Label htmlFor="foundation-timezone">{t('foundations.timeZone')}</Label>
                <Select value={timeZone} onValueChange={setTimeZone}>
                  <SelectTrigger id="foundation-timezone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Seoul">Asia/Seoul</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                  </SelectContent>
                </Select>
              </VStack>
            </div>
            <VStack asChild align="stretch" className="gap-4 rounded-lg border p-4">
              <dl aria-live="polite">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('foundations.amount', { currency: 'USD' })}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold break-words tabular-nums">
                    {formatPreviewNumber(12480.5, { locale, style: 'currency', currency: 'USD' })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('foundations.sampleTime', { timeZone })}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatDate(sampleTimestamp, {
                      locale,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone,
                    })}
                  </dd>
                </div>
              </dl>
            </VStack>
            <p className="text-xs leading-5 text-muted-foreground">{t('foundations.localeHelp')}</p>
          </CardContent>
        </VStack>
      </Card>
    </div>
  )
}

function FeedbackExamples() {
  const { t } = useTranslation('examples')
  const { formatNumber } = useFormatters()
  const [value, setValue] = useState(100400)
  const [numberStyle, setNumberStyle] = useState('decimal')
  const [useGrouping, setUseGrouping] = useState(true)
  const [compact, setCompact] = useState(false)
  const [showCurrency, setShowCurrency] = useState(true)
  const [animate, setAnimate] = useState(false)
  const [replay, setReplay] = useState(0)
  const [recovered, setRecovered] = useState(false)
  const format: NumberFormatOptions = {
    useGrouping,
    notation: compact ? 'compact' : 'standard',
    ...(numberStyle === 'decimal'
      ? { style: 'decimal' }
      : { style: 'currency', currency: numberStyle, showCurrency }),
  }
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.numberTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.numberDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-5">
          <CardContent>
            <MetricCard
              label={
                numberStyle === 'decimal'
                  ? t('foundations.decimalSample')
                  : t('foundations.currencySample', { currency: numberStyle })
              }
              icon={Gauge}
              value={
                <NumberDisplay key={replay} wrap value={value} format={format} animate={animate} />
              }
              footer={t('foundations.originalValue', { value: formatNumber(value) })}
            />
            <VStack align="stretch" className="gap-2">
              <Label htmlFor="foundation-number-style">{t('foundations.numberFormat')}</Label>
              <Select value={numberStyle} onValueChange={setNumberStyle}>
                <SelectTrigger id="foundation-number-style" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decimal">{t('foundations.decimal')}</SelectItem>
                  <SelectItem value="USD">{t('foundations.usd')}</SelectItem>
                  <SelectItem value="KRW">{t('foundations.krw')}</SelectItem>
                </SelectContent>
              </Select>
            </VStack>
            <div className="grid gap-4 xl:grid-cols-2">
              <HStack justify="between" className="gap-3">
                <Label htmlFor="foundation-number-grouping">{t('foundations.grouping')}</Label>
                <Switch
                  id="foundation-number-grouping"
                  checked={useGrouping}
                  onCheckedChange={setUseGrouping}
                />
              </HStack>
              <HStack justify="between" className="gap-3">
                <Label htmlFor="foundation-number-compact">{t('foundations.compact')}</Label>
                <Switch
                  id="foundation-number-compact"
                  checked={compact}
                  onCheckedChange={setCompact}
                />
              </HStack>
              <HStack justify="between" className="gap-3">
                <Label htmlFor="foundation-number-currency">
                  {t('foundations.currencySymbol')}
                </Label>
                <Switch
                  id="foundation-number-currency"
                  checked={showCurrency}
                  onCheckedChange={setShowCurrency}
                  disabled={numberStyle === 'decimal'}
                />
              </HStack>
              <HStack justify="between" className="gap-3">
                <Label htmlFor="foundation-number-animation">
                  {t('foundations.numberAnimation')}
                </Label>
                <Switch
                  id="foundation-number-animation"
                  checked={animate}
                  onCheckedChange={setAnimate}
                />
              </HStack>
            </div>
            <HStack wrap className="gap-2">
              <Button
                onClick={() => {
                  setValue((current) => (current === 100400 ? 1000000 : 100400))
                }}
              >
                {t('foundations.changeValue')}
              </Button>
              <Button
                variant="outline"
                disabled={!animate}
                onClick={() => {
                  setReplay((current) => current + 1)
                }}
              >
                <RotateCcw aria-hidden="true" />
                {t('foundations.replay')}
              </Button>
            </HStack>
            <p className="text-xs leading-5 text-muted-foreground">
              {t('foundations.numberHelp', { duration: formatNumber(300) })}
            </p>
          </CardContent>
        </VStack>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.recoveryTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.recoveryDescription')}</CardDescription>
        </CardHeader>
        <VStack asChild align="stretch" className="gap-5">
          <CardContent>
            <div aria-live="polite">
              {recovered ? (
                <Alert>
                  <Check aria-hidden="true" />
                  <AlertTitle className="line-clamp-none">
                    {t('foundations.loadedTitle')}
                  </AlertTitle>
                  <AlertDescription>{t('foundations.loadedDescription')}</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden="true" />
                  <AlertTitle className="line-clamp-none">
                    {t('foundations.failedTitle')}
                  </AlertTitle>
                  <AlertDescription>{t('foundations.failedDescription')}</AlertDescription>
                </Alert>
              )}
            </div>
            <Button
              className="h-auto min-h-9 max-w-full self-start py-1.5 whitespace-normal"
              variant="outline"
              onClick={() => {
                setRecovered((current) => !current)
              }}
            >
              {recovered ? t('foundations.showError') : t('foundations.showRecovery')}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              {t('foundations.recoveryHelp')}
            </p>
          </CardContent>
        </VStack>
      </Card>
      <Card className="min-w-0 md:col-span-2">
        <CardHeader>
          <CardTitle>
            <h2>{t('foundations.loadingTitle')}</h2>
          </CardTitle>
          <CardDescription>{t('foundations.loadingDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <VStack
              align="stretch"
              key={item}
              className="min-w-0 gap-3 rounded-lg border p-4"
              aria-hidden="true"
            >
              <Skeleton className="h-4 w-24 max-w-full" />
              <Skeleton className="h-8 w-32 max-w-full" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </VStack>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function FoundationsPage() {
  const { t } = useTranslation('examples')
  return (
    <VStack data-slot="page-content" align="stretch" className="min-w-0 gap-6">
      <PageHeader
        title={t('foundations.title')}
        description={t('foundations.description')}
        badgeLabel={t('foundations.standards')}
      />
      <Tabs defaultValue="basics" className="min-w-0">
        <div
          className="min-w-0 scroll-px-1 overflow-x-auto pb-1"
          onFocusCapture={(event) => {
            event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
          }}
        >
          <TabsList aria-label={t('foundations.tabsLabel')}>
            <TabsTrigger value="basics">{t('foundations.basicsTab')}</TabsTrigger>
            <TabsTrigger value="layout">{t('foundations.layoutTab')}</TabsTrigger>
            <TabsTrigger value="content">{t('foundations.contentTab')}</TabsTrigger>
            <TabsTrigger value="feedback">{t('foundations.feedbackTab')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="basics" className="mt-4 min-w-0">
          <BasicsExamples />
        </TabsContent>
        <TabsContent value="layout" className="mt-4 min-w-0">
          <LayoutExamples />
        </TabsContent>
        <TabsContent value="content" className="mt-4 min-w-0">
          <ContentExamples />
        </TabsContent>
        <TabsContent value="feedback" className="mt-4 min-w-0">
          <FeedbackExamples />
        </TabsContent>
      </Tabs>
    </VStack>
  )
}
