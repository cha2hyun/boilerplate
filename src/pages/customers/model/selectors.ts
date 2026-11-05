import type { SampleCustomer } from '@/entities/customer'
import { compareCustomers } from './sample-customers'
import type { CustomersSearch } from './search'

export function selectCustomers(
  customers: SampleCustomer[],
  search: Omit<CustomersSearch, 'detail'>,
) {
  const query = search.q.trim().toLowerCase()
  const filtered = customers
    .filter(
      (customer) =>
        (search.status === 'all' || customer.status === search.status) &&
        `${customer.name} ${customer.email} ${customer.country} ${customer.city}`
          .toLowerCase()
          .includes(query),
    )
    .sort((left, right) => compareCustomers(left, right, search.sort))
  const pageCount = Math.max(1, Math.ceil(filtered.length / search.pageSize))
  const currentPage = Math.min(search.page, pageCount) - 1
  return {
    filtered,
    pageCount,
    currentPage,
    visible: filtered.slice(currentPage * search.pageSize, (currentPage + 1) * search.pageSize),
  }
}

export function summarizeCustomers(customers: SampleCustomer[]) {
  return customers.reduce(
    (summary, customer) => {
      if (customer.status === 'Active') summary.active += 1
      if (customer.orders > 1) summary.returning += 1
      if (customer.orders === 1) summary.firstTime += 1
      return summary
    },
    { active: 0, returning: 0, firstTime: 0 },
  )
}
