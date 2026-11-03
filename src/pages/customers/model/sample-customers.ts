import type { SampleCustomer } from '@/entities/customer'

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
