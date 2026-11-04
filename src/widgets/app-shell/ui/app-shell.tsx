import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Boxes, ChevronDown, ExternalLink, Globe, Moon, Search, Sun } from 'lucide-react'
import { useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { usePreferences } from '@/features/workspace-preferences'
import { env } from '@/shared/config'
import { useIsDesktop } from '@/shared/hooks/use-desktop'
import { navigation, navigationGroups } from '../model/navigation'
import { CurrencyMenu } from './currency-menu'
import { useTheme } from '@/shared/lib/theme'
import { cn } from '@/shared/lib/utils'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb'
import { Button } from '@/shared/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/shared/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Separator } from '@/shared/ui/separator'
import { Kbd } from '@/shared/ui/kbd'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/shared/ui/sidebar'
import { HStack } from '@/shared/ui/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { TextLink } from '@/shared/ui/text-link'

function WorkspaceSidebar() {
  const { t } = useTranslation('workspace')
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-2 pt-5 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center hover:bg-transparent"
            >
              <Link
                to="/"
                aria-label={t('shell.blueprintOverview')}
                onClick={() => {
                  setOpenMobile(false)
                }}
              >
                <HStack
                  justify="center"
                  className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground"
                >
                  <Boxes className="size-5" />
                </HStack>
                <span className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                  blueprint<span className="text-muted-foreground">.</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group} className={group === 'resources' ? 'mt-auto' : undefined}>
            <SidebarGroupLabel>{t(`navigationGroups.${group}`)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.to}
                        tooltip={t(item.labelKey)}
                        className="h-10 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                      >
                        <Link
                          to={item.to}
                          onClick={() => {
                            setOpenMobile(false)
                          }}
                        >
                          <item.icon />
                          <span className="group-data-[collapsible=icon]:sr-only">
                            {t(item.labelKey)}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                {group === 'resources' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip={t('shell.documentation')}
                      className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                    >
                      <a
                        href="https://github.com/cha2hyun/boilerplate#readme"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink />
                        <span className="group-data-[collapsible=icon]:sr-only">
                          {t('shell.documentation')}
                        </span>
                        <ExternalLink className="ml-auto size-3 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={t('shell.workspaceSettings')}
              className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
            >
              <Link
                to="/settings"
                aria-label={t('shell.workspaceSettings')}
                onClick={() => {
                  setOpenMobile(false)
                }}
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    BP
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm group-data-[collapsible=icon]:hidden">
                  <span className="font-medium">{t('shell.yourWorkspace')}</span>
                  <span className="text-xs text-muted-foreground">{t('shell.makeItYours')}</span>
                </div>
                <ChevronDown className="size-4 group-data-[collapsible=icon]:hidden" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

interface AppShellProps {
  children: ReactNode
}
export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation('workspace')
  const locale = useLocalePreferences((state) => state.locale)
  const setLocale = useLocalePreferences((state) => state.setLocale)
  const [commandOpen, setCommandOpen] = useState(false)
  const commandOpenerRef = useRef<HTMLElement | null>(null)
  const commandNavigatedRef = useRef(false)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const isDesktop = useIsDesktop()
  const [sidebarOverride, setSidebarOverride] = useState<{
    desktop: boolean
    open: boolean
  } | null>(null)
  const sidebarOpen = sidebarOverride?.desktop === isDesktop ? sidebarOverride.open : isDesktop
  const { resolvedTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const compact = usePreferences((state) => state.compactMode)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const currentPage = navigation.find((item) => item.to === pathname)
  const title = t(currentPage?.labelKey ?? 'shell.notFound')
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])
  return (
    <SidebarProvider
      className="[--sidebar-width:16rem]"
      open={sidebarOpen}
      onOpenChange={(open) => {
        setSidebarOverride({ desktop: isDesktop, open })
      }}
    >
      <Button asChild className="fixed top-2 left-2 z-50 -translate-y-20 focus:translate-y-0">
        <a href="#main-content">{t('shell.skip')}</a>
      </Button>
      <WorkspaceSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="shrink-0 border-b px-4 md:px-6">
          <HStack className="min-h-16 gap-2 md:gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <Breadcrumb className="hidden min-w-0 md:block">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden xl:inline-flex">
                  {t('common.workspace')}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden xl:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <HStack className="ml-auto shrink-0 gap-1 md:gap-2">
              {env.dataSource === 'demo' && (
                <Badge
                  variant="outline"
                  className="hidden gap-1.5 text-xs font-normal text-muted-foreground 2xl:inline-flex"
                >
                  <span className="size-1.5 rounded-full bg-chart-2" />
                  {t('shell.demo')}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="size-8 gap-2 p-0 text-muted-foreground xl:h-9 xl:w-auto xl:px-3"
                onClick={() => {
                  setCommandOpen(true)
                }}
                aria-label={t('shell.searchWorkspace')}
                aria-keyshortcuts="Meta+K Control+K"
              >
                <Search className="size-4" aria-hidden="true" />
                <span className="hidden xl:inline">{t('shell.search')}</span>
                <Kbd aria-hidden="true" className="hidden xl:inline-flex">
                  ⌘ K
                </Kbd>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t(
                      resolvedTheme === 'dark' ? 'shell.lightTheme' : 'shell.darkTheme',
                    )}
                    onClick={() => {
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                    }}
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('shell.toggleTheme')}</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t('shell.language')}
                      >
                        <Globe className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{t('shell.language')}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('shell.language')}</DropdownMenuLabel>
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
              <CurrencyMenu />
            </HStack>
          </HStack>
        </header>
        <div
          ref={contentRef}
          id="main-content"
          tabIndex={-1}
          className={cn(
            'mx-auto w-full max-w-screen-2xl flex-1 p-4 outline-none md:p-6 xl:p-8',
            compact && 'md:p-4 xl:p-5',
          )}
        >
          {children}
        </div>
        <HStack
          asChild
          justify="between"
          className="gap-4 border-t px-4 py-4 text-xs text-muted-foreground md:px-6"
        >
          <footer>
            <span className="min-w-0">{t('shell.footerAuthor', { author: 'cha2hyun' })}</span>
            <TextLink href="https://github.com/cha2hyun/boilerplate" className="shrink-0">
              GitHub
            </TextLink>
          </footer>
        </HStack>
      </SidebarInset>
      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title={t('shell.searchWorkspace')}
        description={t('shell.searchDescription')}
        onOpenAutoFocus={() => {
          commandOpenerRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
          commandNavigatedRef.current = false
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const target =
            !commandNavigatedRef.current && commandOpenerRef.current?.isConnected
              ? commandOpenerRef.current
              : contentRef.current
          target?.focus()
        }}
      >
        <CommandInput placeholder={t('shell.searchPlaceholder')} />
        <CommandList>
          <CommandEmpty>{t('shell.noPages')}</CommandEmpty>
          <CommandGroup heading={t('shell.navigate')}>
            {navigation.map((item) => (
              <CommandItem
                key={item.to}
                onSelect={() => {
                  commandNavigatedRef.current = true
                  setCommandOpen(false)
                  void navigate({ to: item.to })
                }}
              >
                <item.icon />
                <span>{t(item.labelKey)}</span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t('settings.appearance')}>
            <CommandItem
              onSelect={() => {
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                setCommandOpen(false)
              }}
            >
              <Moon />
              {t('shell.toggleTheme')}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  )
}
