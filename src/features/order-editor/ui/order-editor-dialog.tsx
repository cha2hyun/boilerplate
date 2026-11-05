import { useId, useLayoutEffect, useRef, useState, type RefObject, type SubmitEvent } from 'react'
import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  orderLimits,
  orderPaymentStatuses,
  orderStatuses,
  useCreateOrder,
  useUpdateOrder,
  type SampleOrder,
} from '@/entities/order'
import { ApiError } from '@/shared/api'
import { useUnsavedChanges } from '@/shared/hooks/use-unsaved-changes'
import { useErrorMessage, useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { HStack, VStack } from '@/shared/ui/stack'
import { UnsavedChangesDialog } from '@/shared/ui/unsaved-changes-dialog'
import { initialOrderForm, parseOrderForm, type OrderFormInput } from '../model/form'

interface OrderEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: SampleOrder
  onSaved?: (order: SampleOrder) => void
  onCloseAutoFocus?: (event: Event) => void
}

interface FieldError {
  key:
    | 'errors.text'
    | 'errors.email'
    | 'errors.date'
    | 'errors.choice'
    | 'errors.money'
    | 'errors.quantity'
    | 'errors.items'
  limit?: number
}

function OrderForm({
  open,
  order,
  onOpenChange,
  onSaved,
  onPendingChange,
  onRequestClose,
  leaveGuardRef,
}: Pick<OrderEditorDialogProps, 'open' | 'order' | 'onOpenChange' | 'onSaved'> & {
  onPendingChange: (pending: boolean) => void
  onRequestClose: () => void
  leaveGuardRef: RefObject<(() => Promise<boolean>) | null>
}) {
  const { t } = useTranslation('orderEditor')
  const { t: admin } = useTranslation('admin')
  const { formatNumber } = useFormatters()
  const errorMessage = useErrorMessage()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const [initialInput] = useState(() => initialOrderForm(order))
  const [input, setInput] = useState(initialInput)
  const [errors, setErrors] = useState<Record<string, FieldError>>({})
  const [serverError, setServerError] = useState<Error | null>(null)
  const isPending = createOrder.isPending || updateOrder.isPending
  const protection = useUnsavedChanges({
    dirty: open && JSON.stringify(input) !== JSON.stringify(initialInput),
    pending: open && isPending,
    focusRef: nameRef,
  })
  const requestLeave = protection.requestLeave
  useLayoutEffect(() => {
    leaveGuardRef.current = requestLeave
    return () => {
      leaveGuardRef.current = null
    }
  }, [leaveGuardRef, requestLeave])

  function updateInput(next: OrderFormInput) {
    setInput(next)
    setErrors({})
    setServerError(null)
  }

  function fieldError(path: string) {
    const error = errors[path]
    return error ? (
      <p id={`${formId}-${path}-error`} role="alert" className="text-sm text-destructive">
        {t(error.key, { limit: formatNumber(error.limit ?? 0) })}
      </p>
    ) : null
  }

  function textField(
    field: 'customerName' | 'customerEmail' | 'date' | 'city' | 'country' | 'shipping',
    path = field as string,
  ) {
    return (
      <VStack align="stretch" className="min-w-0 gap-2">
        <Label htmlFor={`${formId}-${path}`}>{t(field)}</Label>
        <Input
          id={`${formId}-${path}`}
          ref={field === 'customerName' ? nameRef : undefined}
          type={field === 'date' ? 'date' : field === 'customerEmail' ? 'email' : 'text'}
          inputMode={field === 'shipping' ? 'decimal' : undefined}
          autoComplete="off"
          value={input[field]}
          disabled={isPending}
          onFocus={(event) => {
            // Radix restores the first field with preventScroll when its focus loop wraps.
            // Keep that field visible inside this form's independently scrolling body.
            if (field === 'customerName') event.currentTarget.scrollIntoView({ block: 'nearest' })
          }}
          onChange={(event) => {
            updateInput({ ...input, [field]: event.target.value })
          }}
          aria-invalid={Boolean(errors[path])}
          aria-describedby={
            errors[path]
              ? `${formId}-${path}-error`
              : field === 'shipping'
                ? `${formId}-currency`
                : undefined
          }
        />
        {fieldError(path)}
      </VStack>
    )
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending || submittingRef.current) return
    const result = parseOrderForm(input)
    if (!result.success) {
      const nextErrors: Record<string, FieldError> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        const field = issue.path.at(-1)
        nextErrors[path] =
          field === 'email'
            ? { key: 'errors.email' }
            : field === 'date'
              ? { key: 'errors.date' }
              : field === 'status' || field === 'payment'
                ? { key: 'errors.choice' }
                : field === 'shipping' || field === 'unitPrice'
                  ? { key: 'errors.money', limit: orderLimits.money / 100 }
                  : field === 'quantity'
                    ? { key: 'errors.quantity', limit: orderLimits.quantity }
                    : field === 'items'
                      ? { key: 'errors.items', limit: orderLimits.items }
                      : { key: 'errors.text', limit: issue.path[0] === 'items' ? 160 : 120 }
      }
      setErrors(nextErrors)
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      )
      return
    }
    setErrors({})
    setServerError(null)
    submittingRef.current = true
    onPendingChange(true)
    try {
      const saved = order
        ? await updateOrder.mutateAsync({ id: order.id, input: result.data })
        : await createOrder.mutateAsync(result.data)
      toast.success(t(order ? 'updated' : 'created'), { description: t('ready', { id: saved.id }) })
      protection.markSaved()
      onSaved?.(saved)
      onOpenChange(false)
    } catch (error) {
      setServerError(error instanceof Error ? error : new Error())
    } finally {
      submittingRef.current = false
      onPendingChange(false)
    }
  }

  return (
    <VStack asChild align="stretch" className="min-h-0 gap-0 overflow-hidden">
      <form
        ref={formRef}
        noValidate
        aria-busy={isPending}
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
      >
        <VStack align="stretch" className="min-h-0 gap-5 overflow-y-auto px-6 py-4">
          <p id={`${formId}-currency`} className="text-sm text-muted-foreground">
            {t('currencyHint')}
          </p>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {textField('customerName', 'customer.name')}
            {textField('customerEmail', 'customer.email')}
            {textField('date')}
            {textField('shipping')}
            {(['status', 'payment'] as const).map((field) => (
              <VStack key={field} align="stretch" className="min-w-0 gap-2">
                <Label htmlFor={`${formId}-${field}`}>{t(field)}</Label>
                <Select
                  value={input[field]}
                  disabled={isPending}
                  onValueChange={(value) => {
                    if (field === 'status' && orderStatuses.some((status) => status === value)) {
                      updateInput({ ...input, status: value as OrderFormInput['status'] })
                    } else if (
                      field === 'payment' &&
                      orderPaymentStatuses.some((payment) => payment === value)
                    ) {
                      updateInput({ ...input, payment: value as OrderFormInput['payment'] })
                    }
                  }}
                >
                  <SelectTrigger
                    id={`${formId}-${field}`}
                    className="w-full"
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={errors[field] ? `${formId}-${field}-error` : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field === 'status'
                      ? orderStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {admin(`orders.status.${status}`)}
                          </SelectItem>
                        ))
                      : orderPaymentStatuses.map((payment) => (
                          <SelectItem key={payment} value={payment}>
                            {admin(`orders.paymentStatus.${payment}`)}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                {fieldError(field)}
              </VStack>
            ))}
            {textField('city')}
            {textField('country')}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('snapshotHint')}</p>
          <VStack asChild align="stretch" className="gap-4">
            <section aria-labelledby={`${formId}-items`}>
              <HStack wrap justify="between" className="gap-2">
                <h2 id={`${formId}-items`} className="text-sm font-medium">
                  {t('items')}
                </h2>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending || input.items.length >= orderLimits.items}
                  onClick={() => {
                    updateInput({
                      ...input,
                      items: [...input.items, { name: '', quantity: '1', unitPrice: '' }],
                    })
                  }}
                >
                  <Plus aria-hidden="true" />
                  {t('addItem')}
                </Button>
              </HStack>
              <p className="text-xs text-muted-foreground">
                {t('itemLimit', { limit: formatNumber(orderLimits.items) })}
              </p>
              {fieldError('items')}
              {input.items.map((item, index) => (
                <VStack
                  asChild
                  align="stretch"
                  key={index}
                  className="min-w-0 gap-3 rounded-lg border p-4"
                >
                  <fieldset
                    disabled={isPending}
                    aria-label={t('item', { number: formatNumber(index + 1) })}
                  >
                    <HStack justify="between" className="gap-2">
                      <p className="text-sm font-medium">
                        {t('item', { number: formatNumber(index + 1) })}
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={t('removeItem', { number: formatNumber(index + 1) })}
                        disabled={isPending || input.items.length <= 1}
                        onClick={() => {
                          updateInput({
                            ...input,
                            items: input.items.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </HStack>
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      {(['name', 'quantity', 'unitPrice'] as const).map((field) => {
                        const path = `items.${String(index)}.${field}`
                        return (
                          <VStack key={field} align="stretch" className="min-w-0 gap-2">
                            <Label htmlFor={`${formId}-${path}`}>
                              {t(field === 'name' ? 'itemName' : field)}
                            </Label>
                            <Input
                              id={`${formId}-${path}`}
                              value={item[field]}
                              inputMode={
                                field === 'quantity'
                                  ? 'numeric'
                                  : field === 'unitPrice'
                                    ? 'decimal'
                                    : undefined
                              }
                              autoComplete="off"
                              onChange={(event) => {
                                updateInput({
                                  ...input,
                                  items: input.items.map((current, itemIndex) =>
                                    itemIndex === index
                                      ? { ...current, [field]: event.target.value }
                                      : current,
                                  ),
                                })
                              }}
                              aria-invalid={Boolean(errors[path])}
                              aria-describedby={
                                errors[path]
                                  ? `${formId}-${path}-error`
                                  : field === 'unitPrice'
                                    ? `${formId}-currency`
                                    : undefined
                              }
                            />
                            {fieldError(path)}
                          </VStack>
                        )
                      })}
                    </div>
                  </fieldset>
                </VStack>
              ))}
            </section>
          </VStack>
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {serverError instanceof ApiError
                ? serverError.status === 404
                  ? t('notFound')
                  : errorMessage(serverError)
                : t('saveError')}
            </div>
          )}
        </VStack>
        <DialogFooter className="shrink-0 border-t p-6">
          <Button type="button" variant="outline" disabled={isPending} onClick={onRequestClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {t(isPending ? 'saving' : order ? 'save' : 'create')}
          </Button>
        </DialogFooter>
        <UnsavedChangesDialog {...protection.dialogProps} />
      </form>
    </VStack>
  )
}

export function OrderEditorDialog({
  open,
  onOpenChange,
  order,
  onSaved,
  onCloseAutoFocus,
}: OrderEditorDialogProps) {
  const { t } = useTranslation('orderEditor')
  const [isPending, setIsPending] = useState(false)
  const leaveGuardRef = useRef<(() => Promise<boolean>) | null>(null)
  async function requestClose() {
    if (isPending) return
    if (!leaveGuardRef.current || (await leaveGuardRef.current())) onOpenChange(false)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange(true)
        else void requestClose()
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={!isPending}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="px-6 pt-6 pr-12 pb-2">
          <DialogTitle>{t(order ? 'editTitle' : 'createTitle')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <OrderForm
          key={order?.id ?? 'new-order'}
          open={open}
          order={order}
          onSaved={onSaved}
          onOpenChange={onOpenChange}
          onPendingChange={setIsPending}
          onRequestClose={() => {
            void requestClose()
          }}
          leaveGuardRef={leaveGuardRef}
        />
      </DialogContent>
    </Dialog>
  )
}
