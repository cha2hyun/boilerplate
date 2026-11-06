import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'

export function UsersQueryAlert({
  heading,
  error,
  retry,
}: {
  heading: string
  error: Error
  retry: () => void
}) {
  const { t } = useTranslation('workspaceUsers')
  const errorMessage = useErrorMessage()
  return (
    <Alert variant="destructive">
      <AlertTitle className="line-clamp-none">{heading}</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          {t('retry')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
