import type { Traffic, TrafficPeriod } from '../model/schema'

const dailyVisitors = [
  684, 752, 691, 845, 921, 642, 578, 790, 866, 803, 912, 1004, 714, 653, 938, 1025, 956, 1098, 1176,
  827, 746, 1059, 1138, 1042, 1214, 1310, 956, 874, 1243, 1384,
]

const traffic = dailyVisitors.map((visitors, index) => {
  const date = new Date(Date.UTC(2026, 9, 5 + index)).toISOString().slice(0, 10)
  const sessions = Math.round(visitors * (1.24 + (index % 4) * 0.03))
  return {
    date,
    visitors,
    sessions,
    pageViews: Math.round(sessions * (2.3 + (index % 3) * 0.12)),
    bounces: Math.round(sessions * (0.41 - index * 0.002)),
  }
})

function distribute(total: number, shares: number[]) {
  let remaining = total
  return shares.map((share, index) => {
    const value = index === shares.length - 1 ? remaining : Math.round(total * share)
    remaining -= value
    return value
  })
}

export function getSampleTraffic(period: TrafficPeriod): Traffic {
  const days = traffic.slice(-Number(period))
  const visitors = days.reduce((sum, day) => sum + day.visitors, 0)
  const sessions = days.reduce((sum, day) => sum + day.sessions, 0)
  const pageViews = days.reduce((sum, day) => sum + day.pageViews, 0)
  const bounces = days.reduce((sum, day) => sum + day.bounces, 0)
  const sourceShares =
    period === '7' ? [0.45, 0.27, 0.15, 0.09, 0.04] : [0.42, 0.28, 0.16, 0.1, 0.04]
  const sourceValues = distribute(sessions, sourceShares)
  const pageValues = distribute(pageViews, [0.36, 0.25, 0.18, 0.13, 0.08])
  const deviceValues = distribute(
    sessions,
    period === '7' ? [0.56, 0.38, 0.06] : [0.59, 0.35, 0.06],
  )

  return {
    days,
    visitors,
    sessions,
    pageViews,
    bounceRate: (bounces / sessions) * 100,
    sources: ['Organic search', 'Direct', 'Referral', 'Social', 'Email'].map((source, index) => ({
      source,
      sessions: sourceValues[index] ?? 0,
      share: ((sourceValues[index] ?? 0) / sessions) * 100,
    })),
    pages: ['/', '/products', '/pricing', '/blog', '/contact'].map((path, index) => ({
      path,
      views: pageValues[index] ?? 0,
      share: ((pageValues[index] ?? 0) / pageViews) * 100,
    })),
    devices: ['Desktop', 'Mobile', 'Tablet'].map((device, index) => ({
      device,
      sessions: deviceValues[index] ?? 0,
    })),
  }
}
