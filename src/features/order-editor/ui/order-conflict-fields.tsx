import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { HStack, VStack } from '@/shared/ui/stack'
import type { OrderFormField, OrderFormInput } from '../model/form'

export function OrderConflictFields({
  fields,
  saved,
  mine,
  onChoose,
}: {
  fields: OrderFormField[]
  saved: OrderFormInput
  mine: OrderFormInput
  onChoose: (field: OrderFormField, useSaved: boolean) => void
}) {
  const { t } = useTranslation('orderEditor')
  const { t: admin } = useTranslation('admin')
  function value(form: OrderFormInput, field: OrderFormField) {
    if (field === 'items') return form.items.map((item) => t('conflictItem', item)).join('\n')
    if (field === 'status') return admin(`orders.status.${form.status}`)
    if (field === 'payment') return admin(`orders.paymentStatus.${form.payment}`)
    return form[field]
  }
  return fields.map((field) => (
    <VStack asChild key={field} align="stretch" className="min-w-0 gap-2 rounded-md border p-3">
      <fieldset>
        <legend className="px-1 text-sm font-semibold">{t(field)}</legend>
        <p className="text-sm wrap-anywhere whitespace-pre-line">
          {t('savedValue', { value: value(saved, field) })}
        </p>
        <p className="text-sm wrap-anywhere whitespace-pre-line">
          {t('mineValue', { value: value(mine, field) })}
        </p>
        <HStack wrap className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChoose(field, true)
            }}
          >
            {t('useSaved')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChoose(field, false)
            }}
          >
            {t('keepMine')}
          </Button>
        </HStack>
      </fieldset>
    </VStack>
  ))
}
