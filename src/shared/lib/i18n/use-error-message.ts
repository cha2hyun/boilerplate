import { useTranslation } from 'react-i18next'
import { ApiError } from '@/shared/api'

export function useErrorMessage() {
  const { t } = useTranslation('common')
  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code === 'NETWORK_ERROR') return t('errors.network')
      if (error.code === 'TIMEOUT')
        return t(error.mayHaveSucceeded ? 'errors.timeoutWrite' : 'errors.timeout')
      if (error.code === 'INVALID_RESPONSE') return t('errors.invalidResponse')
      if (error.status === 404) return t('errors.notFound')
      return t('errors.request')
    }
    return t('errors.unexpected')
  }
}
