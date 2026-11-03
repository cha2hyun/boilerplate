import type { Project } from '../model/schema'

/** A fixed fixture keeps the demo reproducible and clearly separate from live data. */
export const seedProjects: Project[] = [
  {
    id: 'prj_website',
    name: 'Website redesign',
    description: 'A fresh digital home for the next chapter of our brand.',
    status: 'active',
    owner: { name: 'Olivia Rhye', email: 'olivia@example.com', initials: 'OR' },
    progress: 72,
    updatedAt: '2026-11-03T08:40:00.000Z',
  },
  {
    id: 'prj_mobile',
    name: 'Mobile app launch',
    description: 'Bring the full workspace experience to iOS and Android.',
    status: 'active',
    owner: { name: 'Phoenix Baker', email: 'phoenix@example.com', initials: 'PB' },
    progress: 48,
    updatedAt: '2026-11-03T07:15:00.000Z',
  },
  {
    id: 'prj_design',
    name: 'Design system',
    description: 'Shared foundations and components for a consistent product.',
    status: 'active',
    owner: { name: 'Lana Steiner', email: 'lana@example.com', initials: 'LS' },
    progress: 90,
    updatedAt: '2026-11-02T16:20:00.000Z',
  },
  {
    id: 'prj_analytics',
    name: 'Customer insights',
    description: 'Turn product signals into a clearer picture of our customers.',
    status: 'paused',
    owner: { name: 'Demi Wilkinson', email: 'demi@example.com', initials: 'DW' },
    progress: 35,
    updatedAt: '2026-11-02T10:00:00.000Z',
  },
  {
    id: 'prj_onboarding',
    name: 'Onboarding experience',
    description: 'Help every new team reach their first meaningful milestone.',
    status: 'active',
    owner: { name: 'Alex Morgan', email: 'alex@example.com', initials: 'AM' },
    progress: 64,
    updatedAt: '2026-11-01T13:45:00.000Z',
  },
  {
    id: 'prj_campaign',
    name: 'Autumn campaign',
    description: 'A completed launch campaign for our autumn product release.',
    status: 'archived',
    owner: { name: 'Olivia Rhye', email: 'olivia@example.com', initials: 'OR' },
    progress: 100,
    updatedAt: '2026-10-30T09:30:00.000Z',
  },
]
