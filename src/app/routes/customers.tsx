import { useCallback } from 'react'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import {
  CustomersPage,
  customersSearchDefaults,
  customersSearchSchema,
  type CustomersSearch,
} from '@/pages/customers'
import type { SearchChange } from '@/shared/lib/search-params'

export const Route = createFileRoute('/customers')({
  validateSearch: customersSearchSchema,
  search: { middlewares: [stripSearchParams(customersSearchDefaults)] },
  component: function CustomersRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const onSearchChange = useCallback<SearchChange<CustomersSearch>>(
      (patch, options) => {
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace: options?.replace,
          resetScroll: false,
        })
      },
      [navigate],
    )

    return <CustomersPage search={search} onSearchChange={onSearchChange} />
  },
})
