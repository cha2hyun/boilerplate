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
  { labelKey: 'navigation.overview', to: '/', icon: ChartNoAxesCombined, group: 'workspace' },
  { labelKey: 'navigation.projects', to: '/projects', icon: FolderKanban, group: 'workspace' },
  { labelKey: 'navigation.analytics', to: '/analytics', icon: ChartColumn, group: 'sampleAdmin' },
  { labelKey: 'navigation.orders', to: '/orders', icon: ShoppingBag, group: 'sampleAdmin' },
  { labelKey: 'navigation.customers', to: '/customers', icon: Users, group: 'sampleAdmin' },
  { labelKey: 'navigation.inbox', to: '/inbox', icon: Inbox, group: 'sampleAdmin' },
  { labelKey: 'navigation.components', to: '/components', icon: LayoutGrid, group: 'resources' },
  { labelKey: 'navigation.foundations', to: '/foundations', icon: BookOpen, group: 'resources' },
  { labelKey: 'navigation.settings', to: '/settings', icon: Settings2, group: 'resources' },
] as const

export const navigationGroups = ['workspace', 'sampleAdmin', 'resources'] as const
