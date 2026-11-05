import { useRef } from 'react'
import { useUnsavedChanges } from '@/shared/hooks/use-unsaved-changes'
import { ApiError } from '@/shared/api'
import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteCustomer, type SampleCustomer } from '@/entities/customer'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'

interface CustomerDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: SampleCustomer | null
  onCloseAutoFocus?: (event: Event) => void
}

export function CustomerDeleteDialog({
  open,
  onOpenChange,
  customer,
  onCloseAutoFocus,
}: CustomerDeleteDialogProps) {
  const { t } = useTranslation('customerEditor')
  const errorMessage = useErrorMessage()
  const deleteCustomer = useDeleteCustomer()
  const deleteRef = useRef<HTMLButtonElement>(null)
  const deletingRef = useRef(false)
  useUnsavedChanges({
    dirty: false,
    pending: open && deleteCustomer.isPending,
    focusRef: deleteRef,
  })

  function handleOpenChange(nextOpen: boolean) {
    if (deleteCustomer.isPending || deletingRef.current) return
    deleteCustomer.reset()
    onOpenChange(nextOpen)
  }

  async function handleDelete() {
    if (!customer || deleteCustomer.isPending || deletingRef.current) return
    deletingRef.current = true
    try {
      await deleteCustomer.mutateAsync(customer.id)
      toast.success(t('delete.success'), {
        description: t('delete.successDescription', { name: customer.name }),
      })
      onOpenChange(false)
      deleteCustomer.reset()
    } catch {
      // The mutation error is shown in the dialog so the user can retry.
    } finally {
      deletingRef.current = false
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            {t('delete.description', { name: customer?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteCustomer.error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {deleteCustomer.error instanceof ApiError
              ? deleteCustomer.error.status === 404
                ? t('delete.notFound')
                : errorMessage(deleteCustomer.error)
              : t('delete.error')}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteCustomer.isPending}>
            {t('delete.keep')}
          </AlertDialogCancel>
          <Button
            ref={deleteRef}
            variant="destructive"
            onClick={() => {
              void handleDelete()
            }}
            disabled={deleteCustomer.isPending || !customer}
          >
            {deleteCustomer.isPending && (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {t(deleteCustomer.isPending ? 'delete.pending' : 'remove')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
