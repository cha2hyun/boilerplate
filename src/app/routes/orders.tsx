import { useCallback } from 'react'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { OrdersPage } from '@/pages/orders'
import { ordersSearchDefaults, ordersSearchSchema, type OrdersSearch } from '@/pages/orders/search'
import type { SearchChange } from '@/shared/lib/search-params'

export const Route = createFileRoute('/orders')({
  validateSearch: ordersSearchSchema,
  search: { middlewares: [stripSearchParams(ordersSearchDefaults)] },
  component: function OrdersRoute() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const onSearchChange = useCallback<SearchChange<OrdersSearch>>(
      (patch, options) => {
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace: options?.replace,
          resetScroll: false,
        })
      },
      [navigate],
    )

    return <OrdersPage search={search} onSearchChange={onSearchChange} />
  },
})
