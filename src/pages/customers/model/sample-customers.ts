export const customerStatuses = ['Active', 'Inactive'] as const
export type CustomerStatus = (typeof customerStatuses)[number]

export interface SampleCustomer {
  id: string
  name: string
  email: string
  initials: string
  status: CustomerStatus
  city: string
  country: string
  joined: string
  lastOrder: string | null
  orders: number
  spent: number
}

export const sampleCustomers: SampleCustomer[] = [
  {
    id: 'CUS-1012',
    name: 'Olivia Rhye',
    email: 'olivia@example.com',
    initials: 'OR',
    status: 'Active',
    city: 'New York',
    country: 'United States',
    joined: '2026-10-28',
    lastOrder: '2026-11-03',
    orders: 4,
    spent: 42500,
  },
  {
    id: 'CUS-1011',
    name: 'Phoenix Baker',
    email: 'phoenix@example.com',
    initials: 'PB',
    status: 'Active',
    city: 'London',
    country: 'United Kingdom',
    joined: '2026-10-21',
    lastOrder: '2026-11-03',
    orders: 8,
    spent: 86400,
  },
  {
    id: 'CUS-1010',
    name: 'Lana Steiner',
    email: 'lana@example.com',
    initials: 'LS',
    status: 'Active',
    city: 'Berlin',
    country: 'Germany',
    joined: '2026-10-15',
    lastOrder: '2026-11-02',
    orders: 12,
    spent: 152800,
  },
  {
    id: 'CUS-1009',
    name: 'Demi Wilkinson',
    email: 'demi@example.com',
    initials: 'DW',
    status: 'Active',
    city: 'Sydney',
    country: 'Australia',
    joined: '2026-10-10',
    lastOrder: '2026-11-02',
    orders: 1,
    spent: 8700,
  },
  {
    id: 'CUS-1008',
    name: 'Drew Cano',
    email: 'drew@example.com',
    initials: 'DC',
    status: 'Inactive',
    city: 'Toronto',
    country: 'Canada',
    joined: '2026-09-24',
    lastOrder: '2026-11-01',
    orders: 3,
    spent: 21900,
  },
  {
    id: 'CUS-1007',
    name: 'Natali Craig',
    email: 'natali@example.com',
    initials: 'NC',
    status: 'Active',
    city: 'Paris',
    country: 'France',
    joined: '2026-09-18',
    lastOrder: '2026-10-31',
    orders: 6,
    spent: 68200,
  },
  {
    id: 'CUS-1006',
    name: 'Orlando Diggs',
    email: 'orlando@example.com',
    initials: 'OD',
    status: 'Active',
    city: 'San Francisco',
    country: 'United States',
    joined: '2026-09-07',
    lastOrder: '2026-10-30',
    orders: 15,
    spent: 241600,
  },
  {
    id: 'CUS-1005',
    name: 'Andi Lane',
    email: 'andi@example.com',
    initials: 'AL',
    status: 'Active',
    city: 'Amsterdam',
    country: 'Netherlands',
    joined: '2026-08-22',
    lastOrder: '2026-10-29',
    orders: 7,
    spent: 59300,
  },
  {
    id: 'CUS-1004',
    name: 'Kate Morrison',
    email: 'kate@example.com',
    initials: 'KM',
    status: 'Inactive',
    city: 'Austin',
    country: 'United States',
    joined: '2026-08-14',
    lastOrder: '2026-10-28',
    orders: 2,
    spent: 7800,
  },
  {
    id: 'CUS-1003',
    name: 'Koray Okumus',
    email: 'koray@example.com',
    initials: 'KO',
    status: 'Inactive',
    city: 'Istanbul',
    country: 'Türkiye',
    joined: '2026-07-30',
    lastOrder: '2026-10-27',
    orders: 5,
    spent: 43500,
  },
  {
    id: 'CUS-1002',
    name: 'Alex Morgan',
    email: 'alex@example.com',
    initials: 'AM',
    status: 'Active',
    city: 'Seoul',
    country: 'South Korea',
    joined: '2026-07-16',
    lastOrder: '2026-10-26',
    orders: 10,
    spent: 124500,
  },
  {
    id: 'CUS-1001',
    name: 'Kelly Williams',
    email: 'kelly@example.com',
    initials: 'KW',
    status: 'Inactive',
    city: 'Dublin',
    country: 'Ireland',
    joined: '2026-07-02',
    lastOrder: '2026-10-25',
    orders: 1,
    spent: 3600,
  },
]

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatCustomerAmount(cents: number) {
  return currencyFormatter.format(cents / 100)
}

export function formatCustomerDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

export const customerSortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name: A to Z' },
  { value: 'highest', label: 'Spend: high to low' },
  { value: 'lowest', label: 'Spend: low to high' },
] as const
export type CustomerSort = (typeof customerSortOptions)[number]['value']

export function compareCustomers(left: SampleCustomer, right: SampleCustomer, sort: CustomerSort) {
  if (sort === 'name') return left.name.localeCompare(right.name)
  if (sort === 'highest') return right.spent - left.spent
  if (sort === 'lowest') return left.spent - right.spent
  return right.joined.localeCompare(left.joined)
}
