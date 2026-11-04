import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { useTranslation } from '@/shared/lib/i18n'

export function StartupError() {
  const { t } = useTranslation('common')
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('startup.title')}</AlertTitle>
          <AlertDescription>{t('startup.description')}</AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            window.location.reload()
          }}
        >
          {t('startup.reload')}
        </Button>
      </div>
    </main>
  )
}
