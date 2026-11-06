import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from '@/shared/ui/sonner'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { queryClient } from './providers/query-client'
import { ThemeProvider } from './providers/theme-provider'
import { router } from './router'
import { LocalizationProvider } from './providers/localization-provider'
export function App() {
  return (
    <LocalizationProvider>
      <ThemeProvider defaultTheme="system">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster closeButton position="bottom-right" />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </LocalizationProvider>
  )
}
