import {
  ChartNoAxesCombined,
  FolderKanban,
  Inbox,
  LayoutGrid,
  Settings2,
  ShoppingBag,
  Users,
  ChartColumn,
  BookOpen,
} from 'lucide-react'

export const navigation = [
  { label: 'Overview', to: '/', icon: ChartNoAxesCombined, group: 'Workspace' },
  { label: 'Projects', to: '/projects', icon: FolderKanban, group: 'Workspace' },
  { label: 'Analytics', to: '/analytics', icon: ChartColumn, group: 'Sample admin' },
  { label: 'Orders', to: '/orders', icon: ShoppingBag, group: 'Sample admin' },
  { label: 'Customers', to: '/customers', icon: Users, group: 'Sample admin' },
  { label: 'Inbox', to: '/inbox', icon: Inbox, group: 'Sample admin' },
  { label: 'Components', to: '/components', icon: LayoutGrid, group: 'Resources' },
  { label: 'Foundations', to: '/foundations', icon: BookOpen, group: 'Resources' },
  { label: 'Settings', to: '/settings', icon: Settings2, group: 'Resources' },
] as const

export const navigationGroups = ['Workspace', 'Sample admin', 'Resources'] as const
