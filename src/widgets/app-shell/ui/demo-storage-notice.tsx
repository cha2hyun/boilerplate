import { Info } from 'lucide-react'
import { useDemoStorageUnavailable } from '@/shared/hooks/use-demo-storage'
import { useTranslation } from '@/shared/lib/i18n'
import { Alert, AlertDescription } from '@/shared/ui/alert'

export function DemoStorageNotice() {
  const unavailable = useDemoStorageUnavailable()
  const { t } = useTranslation('common')
  if (!unavailable) return null
  return (
    <Alert role="status" className="mb-6">
      <Info aria-hidden="true" />
      <AlertDescription>{t('demoStorage.sessionOnly')}</AlertDescription>
    </Alert>
  )
}
