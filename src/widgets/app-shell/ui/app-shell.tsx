import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Boxes,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
  Moon,
  Search,
  Settings2,
  Sun,
} from 'lucide-react'
import { usePreferences } from '@/features/workspace-preferences'
import { env } from '@/shared/config'
import { useIsDesktop } from '@/shared/hooks/use-desktop'
import { navigation, navigationGroups } from '../model/navigation'
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Separator } from '@/shared/ui/separator'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

function WorkspaceSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const workspaceName = usePreferences((state) => state.workspaceName)
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-5 px-3 pt-5 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="hover:bg-transparent">
              <Link
                to="/"
                onClick={() => {
                  setOpenMobile(false)
                }}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Boxes className="size-5" />
                </div>
                <span className="text-lg font-semibold tracking-tight">
                  blueprint<span className="text-muted-foreground">.</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="border border-sidebar-border bg-background shadow-xs"
            >
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md text-xs">
                  {workspaceName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{workspaceName}</span>
                <span className="text-xs text-muted-foreground">Personal workspace</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-56">
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/settings"
                onClick={() => {
                  setOpenMobile(false)
                }}
              >
                <Settings2 />
                Workspace settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group} className={group === 'Resources' ? 'mt-auto' : undefined}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.to}
                        tooltip={item.label}
                        className="h-10"
                      >
                        <Link
                          to={item.to}
                          onClick={() => {
                            setOpenMobile(false)
                          }}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                {group === 'Resources' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Documentation">
                      <a
                        href="https://github.com/cha2hyun/boilerplate#readme"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink />
                        <span>Documentation</span>
                        <ExternalLink className="ml-auto size-3 text-muted-foreground" />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Separator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link
                to="/settings"
                onClick={() => {
                  setOpenMobile(false)
                }}
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    BP
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm">
                  <span className="font-medium">Your workspace</span>
                  <span className="text-xs text-muted-foreground">Make it your own</span>
                </div>
                <ChevronDown className="size-4" />
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
  const title = navigation.find((item) => item.to === pathname)?.label ?? 'Page not found'
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
        <a href="#main-content">Skip to content</a>
      </Button>
      <WorkspaceSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:inline-flex">Workspace</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            {env.dataSource === 'demo' && (
              <Badge
                variant="outline"
                className="hidden gap-1.5 text-xs font-normal text-muted-foreground md:inline-flex"
              >
                <span className="size-1.5 rounded-full bg-chart-2" />
                Demo workspace
              </Badge>
            )}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground md:pr-14"
                onClick={() => {
                  setCommandOpen(true)
                }}
                aria-label="Search workspace"
                aria-keyshortcuts="Meta+K Control+K"
              >
                <Search className="size-4" aria-hidden="true" />
                <span className="hidden xl:inline">Search</span>
              </Button>
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1 text-[10px] text-muted-foreground md:inline"
              >
                ⌘ K
              </kbd>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
                  }
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
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
          </div>
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
        <footer className="flex items-center justify-between gap-4 border-t px-6 py-4 text-xs text-muted-foreground">
          <span>Blueprint workspace</span>
          <span>Built for what comes next.</span>
        </footer>
      </SidebarInset>
      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Search workspace"
        description="Jump to a page in your workspace."
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
        <CommandInput placeholder="Where would you like to go?" />
        <CommandList>
          <CommandEmpty>No pages found.</CommandEmpty>
          <CommandGroup heading="Navigate">
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
                <span>{item.label}</span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Appearance">
            <CommandItem
              onSelect={() => {
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                setCommandOpen(false)
              }}
            >
              <Moon />
              Toggle theme
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  )
}
