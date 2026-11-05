import { useId, useLayoutEffect, useRef, useState, type RefObject, type SubmitEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  customerInputSchema,
  customerStatuses,
  useCreateCustomer,
  useUpdateCustomer,
  type SampleCustomer,
  type CustomerInput,
} from '@/entities/customer'
import { ApiError } from '@/shared/api'
import { useUnsavedChanges } from '@/shared/hooks/use-unsaved-changes'
import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
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
import { VStack } from '@/shared/ui/stack'
import { UnsavedChangesDialog } from '@/shared/ui/unsaved-changes-dialog'

interface CustomerEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: SampleCustomer
  onCreated?: (customer: SampleCustomer) => void
  onCloseAutoFocus?: (event: Event) => void
}

type FieldErrors = Partial<Record<keyof CustomerInput, boolean>>
const textFields = ['name', 'email', 'city', 'country', 'joined'] as const

function today() {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function CustomerForm({
  open,
  customer,
  onOpenChange,
  onCreated,
  onPendingChange,
  onRequestClose,
  leaveGuardRef,
}: Pick<CustomerEditorDialogProps, 'open' | 'customer' | 'onOpenChange' | 'onCreated'> & {
  onPendingChange: (pending: boolean) => void
  onRequestClose: () => void
  leaveGuardRef: RefObject<(() => Promise<boolean>) | null>
}) {
  const { t } = useTranslation('customerEditor')
  const errorMessage = useErrorMessage()
  const formId = useId()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const [initialInput] = useState<CustomerInput>({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    status: customer?.status ?? 'Active',
    city: customer?.city ?? '',
    country: customer?.country ?? '',
    joined: customer?.joined ?? today(),
  })
  const [input, setInput] = useState(initialInput)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<Error | null>(null)
  const isPending = createCustomer.isPending || updateCustomer.isPending
  const nameRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const protection = useUnsavedChanges({
    dirty:
      open &&
      (Object.keys(initialInput) as (keyof CustomerInput)[]).some(
        (field) => input[field] !== initialInput[field],
      ),
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

  function updateField<Key extends keyof CustomerInput>(field: Key, value: CustomerInput[Key]) {
    setInput((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setServerError(null)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending || submittingRef.current) return

    const result = customerInputSchema.safeParse(input)
    if (!result.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof CustomerInput
        if (field in input && !nextErrors[field]) {
          nextErrors[field] = true
        }
      }
      setErrors(nextErrors)
      const firstField = result.error.issues[0]?.path[0]
      if (typeof firstField === 'string')
        document.getElementById(`${formId}-${firstField}`)?.focus()
      return
    }

    setErrors({})
    setServerError(null)
    submittingRef.current = true
    onPendingChange(true)
    try {
      let created: SampleCustomer | undefined
      if (customer) {
        await updateCustomer.mutateAsync({ id: customer.id, input: result.data })
      } else {
        created = await createCustomer.mutateAsync(result.data)
      }
      toast.success(t(customer ? 'updated' : 'created'), {
        description: t('ready', { name: result.data.name }),
      })
      protection.markSaved()
      onOpenChange(false)
      if (created) onCreated?.(created)
    } catch (error) {
      setServerError(error instanceof Error ? error : new Error())
    } finally {
      submittingRef.current = false
      onPendingChange(false)
    }
  }

  return (
    <VStack asChild align="stretch" className="min-w-0 gap-5">
      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        noValidate
      >
        {textFields.map((field) => (
          <VStack key={field} align="stretch" className="min-w-0 gap-2">
            <Label htmlFor={`${formId}-${field}`}>{t(`fields.${field}`)}</Label>
            <Input
              id={`${formId}-${field}`}
              ref={field === 'name' ? nameRef : undefined}
              type={field === 'email' ? 'email' : field === 'joined' ? 'date' : 'text'}
              autoComplete="off"
              value={input[field]}
              onChange={(event) => {
                updateField(field, event.target.value)
              }}
              disabled={isPending}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `${formId}-${field}-error` : undefined}
            />
            {errors[field] && (
              <p id={`${formId}-${field}-error`} role="alert" className="text-sm text-destructive">
                {t(`errors.${field}`)}
              </p>
            )}
          </VStack>
        ))}
        <VStack align="stretch" className="gap-2">
          <Label htmlFor={`${formId}-status`}>{t('fields.status')}</Label>
          <Select
            value={input.status}
            onValueChange={(value) => {
              const status = customerStatuses.find((item) => item === value)
              if (status) updateField('status', status)
            }}
            disabled={isPending}
          >
            <SelectTrigger
              id={`${formId}-status`}
              className="w-full"
              aria-invalid={Boolean(errors.status)}
              aria-describedby={errors.status ? `${formId}-status-error` : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {customerStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p id={`${formId}-status-error`} role="alert" className="text-sm text-destructive">
              {t('errors.status')}
            </p>
          )}
        </VStack>
        <p className="text-xs text-muted-foreground">{t('historyHint')}</p>
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
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-9 min-w-0 py-1.5 whitespace-normal"
            disabled={isPending}
            onClick={onRequestClose}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            className="h-auto min-h-9 min-w-0 py-1.5 whitespace-normal"
            disabled={isPending}
          >
            {isPending && (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {t(isPending ? 'saving' : customer ? 'save' : 'create')}
          </Button>
        </DialogFooter>
        <UnsavedChangesDialog {...protection.dialogProps} />
      </form>
    </VStack>
  )
}

export function CustomerEditorDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
  onCloseAutoFocus,
}: CustomerEditorDialogProps) {
  const { t } = useTranslation('customerEditor')
  const [isPending, setIsPending] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
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
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-lg"
        showCloseButton={!isPending}
        onOpenAutoFocus={() => {
          triggerRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={
          onCloseAutoFocus ??
          ((event) => {
            if (triggerRef.current?.isConnected) {
              event.preventDefault()
              triggerRef.current.focus()
            }
          })
        }
      >
        <DialogHeader>
          <DialogTitle>{t(customer ? 'edit' : 'createTitle')}</DialogTitle>
          <DialogDescription>
            {t(customer ? 'editDescription' : 'createDescription')}
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          key={customer?.id ?? 'new-customer'}
          open={open}
          customer={customer}
          onCreated={onCreated}
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
