import type { SampleCustomer } from '@/entities/customer'

export const customerSortOptions = [
  { value: 'newest' },
  { value: 'name' },
  { value: 'highest' },
  { value: 'lowest' },
] as const
export type CustomerSort = (typeof customerSortOptions)[number]['value']

export function compareCustomers(left: SampleCustomer, right: SampleCustomer, sort: CustomerSort) {
  if (sort === 'name') return left.name.localeCompare(right.name)
  if (sort === 'highest') return right.spent - left.spent
  if (sort === 'lowest') return left.spent - right.spent
  return right.joined.localeCompare(left.joined)
}
