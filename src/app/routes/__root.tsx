import { RootLayout } from '../providers/root-layout'
import { createRootRouteWithContext, Link } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from '@/shared/lib/i18n'
import { reportError } from '@/shared/lib/error-reporting'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { HStack } from '@/shared/ui/stack'
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  onCatch: (error) => {
    reportError(error, { source: 'route' })
  },
  notFoundComponent: function NotFound() {
    const { t } = useTranslation('common')
    return (
      <Card className="mx-auto my-16 max-w-md text-center">
        <CardHeader>
          <CardDescription>{t('route.notFound')}</CardDescription>
          <CardTitle className="text-2xl">{t('route.backTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">{t('route.back')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  },
  errorComponent: function RouteError({ reset }) {
    const { t } = useTranslation('common')
    return (
      <Card className="m-8 max-w-lg">
        <CardHeader>
          <TriangleAlert className="text-destructive" />
          <CardTitle>{t('route.errorTitle')}</CardTitle>
          <CardDescription>{t('route.errorDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <HStack wrap className="gap-2">
            <Button onClick={reset}>{t('route.retry')}</Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload()
              }}
            >
              {t('appError.reload')}
            </Button>
          </HStack>
        </CardContent>
      </Card>
    )
  },
})
