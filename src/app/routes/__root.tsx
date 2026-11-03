import { RootLayout } from '../providers/root-layout'
import { createRootRouteWithContext, Link } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: () => (
    <Card className="mx-auto my-16 max-w-md text-center">
      <CardHeader>
        <CardDescription>404 · PAGE NOT FOUND</CardDescription>
        <CardTitle className="text-2xl">Let's get you back on track.</CardTitle>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/">Back to overview</Link>
        </Button>
      </CardContent>
    </Card>
  ),
  errorComponent: ({ reset }) => (
    <Card className="m-8 max-w-lg">
      <CardHeader>
        <TriangleAlert className="text-destructive" />
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          Your workspace couldn't load. Try again or refresh this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  ),
})
