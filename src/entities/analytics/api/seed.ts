import type { Analytics } from '../model/schema'

const dailyRevenue = [
  620, 740, 680, 810, 760, 690, 890, 840, 730, 920, 880, 1010, 940, 860, 1080, 980, 1140, 1060, 990,
  1210, 1130, 1280, 1190, 1090, 1320, 1250, 1390, 1310, 1460, 1380,
]
const previousRevenue = [
  540, 610, 570, 680, 630, 600, 720, 690, 640, 760, 740, 810, 790, 700, 870, 830, 940, 890, 850,
  1010, 960, 1080, 1020, 950, 1110, 1050, 1170, 1100, 1220, 1160,
]
const totalRevenue = dailyRevenue.reduce((sum, value) => sum + value, 0)
const previousTotal = previousRevenue.reduce((sum, value) => sum + value, 0)

export const demoAnalytics: Analytics = {
  kpis: [
    {
      id: 'revenue',
      label: 'Total revenue',
      value: totalRevenue,
      change: Math.round(((totalRevenue - previousTotal) / previousTotal) * 1000) / 10,
      format: 'currency',
      description: 'vs. previous 30 days',
    },
    {
      id: 'customers',
      label: 'Active customers',
      value: 2420,
      change: 12.8,
      format: 'number',
      description: 'vs. previous 30 days',
    },
    {
      id: 'orders',
      label: 'Total orders',
      value: 384,
      change: 8.2,
      format: 'number',
      description: 'vs. previous 30 days',
    },
    {
      id: 'conversion',
      label: 'Conversion rate',
      value: 3.62,
      change: 0.6,
      format: 'percent',
      description: 'percentage points vs. prior period',
    },
  ],
  revenue: dailyRevenue.map((revenue, index) => {
    const previous = previousRevenue[index]
    if (previous === undefined) throw new Error('Missing comparison data for demo revenue.')
    return {
      date: new Date(Date.UTC(2026, 9, 5 + index)).toISOString().slice(0, 10),
      revenue,
      previousRevenue: previous,
    }
  }),
  activity: [
    {
      id: 'act_1',
      title: 'Website redesign updated',
      description: 'Olivia Rhye moved the project to 72% complete.',
      time: '2026-11-03T08:40:00.000Z',
      type: 'project',
    },
    {
      id: 'act_2',
      title: 'A new teammate joined',
      description: 'Phoenix Baker joined the Product team.',
      time: '2026-11-03T07:50:00.000Z',
      type: 'member',
    },
    {
      id: 'act_3',
      title: 'November invoice paid',
      description: 'The workspace invoice for $249.00 was paid.',
      time: '2026-11-03T06:30:00.000Z',
      type: 'billing',
    },
    {
      id: 'act_4',
      title: 'Design system milestone reached',
      description: 'Lana Steiner completed the component library review.',
      time: '2026-11-02T16:20:00.000Z',
      type: 'project',
    },
  ],
}
