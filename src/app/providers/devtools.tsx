import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { Bug } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export default function Devtools() {
  return (
    <TanStackDevtools
      config={{
        position: 'middle-right',
        triggerMode: 'fixed',
        customTrigger: (
          <Button asChild variant="outline" size="icon-sm">
            <span aria-hidden="true">
              <Bug className="size-4" />
            </span>
          </Button>
        ),
      }}
      plugins={[
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
        { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
      ]}
    />
  )
}
