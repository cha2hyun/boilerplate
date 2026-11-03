import type { SampleCustomer } from '@/entities/customer'
import { formatNumber } from '@/shared/lib/format'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatCustomerAmount(cents: number) {
  return formatNumber(cents / 100, { style: 'currency', currency: 'USD' })
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
