import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { VStack } from '@/shared/ui/stack'
import { useTranslation } from '@/shared/lib/i18n'

export function StartupError() {
  const { t } = useTranslation('common')
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <VStack align="stretch" className="max-w-md gap-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('startup.title')}</AlertTitle>
          <AlertDescription>{t('startup.description')}</AlertDescription>
        </Alert>
        <Button
          className="self-start"
          onClick={() => {
            window.location.reload()
          }}
        >
          {t('startup.reload')}
        </Button>
      </VStack>
    </main>
  )
}
