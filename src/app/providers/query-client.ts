import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      retry: (count, error) =>
        !(
          error instanceof ApiError &&
          (error.code === 'INVALID_RESPONSE' ||
            (error.status !== null && error.status >= 400 && error.status < 500))
        ) && count < 2,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})
