import { product } from '@/shared/config/product'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Boxes, ExternalLink, Globe, Moon, Search, Sun } from 'lucide-react'
import { useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { usePreferences } from '@/features/workspace-preferences'
import { useIsDesktop } from '@/shared/hooks/use-desktop'
import { navigation, navigationGroups } from '../model/navigation'
import { CurrencyMenu } from './currency-menu'
import { useTheme } from '@/shared/lib/theme'
import { cn } from '@/shared/lib/utils'
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
  const workspaceName = usePreferences((state) => state.workspaceName)
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-2 pt-5 pb-3 md:py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="p-0 hover:bg-transparent">
              <Link
                to="/"
                aria-label={t('shell.blueprintOverview', { product: product.name })}
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
                <span className="text-lg font-semibold tracking-tight transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0 motion-reduce:transition-none">
                  {product.wordmark}
                  <span className="text-muted-foreground">.</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group} className={group === 'resources' ? 'mt-auto' : undefined}>
            <div
              data-slot="sidebar-group-label-collapse"
              className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-200 ease-out group-data-[collapsible=icon]:grid-rows-[0fr] motion-reduce:transition-none"
            >
              <div className="min-h-0 overflow-hidden">
                <SidebarGroupLabel className="h-auto min-h-8 wrap-anywhere whitespace-normal md:w-[calc(var(--sidebar-width)-2rem)]">
                  {group === 'workspace' ? workspaceName : t(`navigationGroups.${group}`)}
                </SidebarGroupLabel>
              </div>
            </div>
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
                        className="h-10"
                      >
                        <Link
                          to={item.to}
                          onClick={() => {
                            setOpenMobile(false)
                          }}
                        >
                          <item.icon />
                          <span className="transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0 motion-reduce:transition-none">
                            {t(item.labelKey)}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                {group === 'resources' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('shell.documentation')} className="h-10">
                      <a href={product.documentationUrl} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        <span className="transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0 motion-reduce:transition-none">
                          {t('shell.documentation')}
                        </span>
                        <ExternalLink className="ml-auto size-3 text-muted-foreground transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0 motion-reduce:transition-none" />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
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
      <Button
        asChild
        className="fixed top-2 left-2 z-50 -translate-y-20 focus:translate-y-0 motion-reduce:transition-none"
      >
        <a href="#main-content">{t('shell.skip')}</a>
      </Button>
      <WorkspaceSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="shrink-0 border-b px-4 md:px-6">
          <HStack wrap className="min-h-16 gap-2 py-2 md:gap-3">
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
            <HStack wrap className="ml-auto max-w-full shrink-0 gap-1 md:gap-2">
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
            <span className="min-w-0">{t('shell.footerAuthor', { author: product.author })}</span>
            <TextLink href={product.repositoryUrl} className="shrink-0">
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
