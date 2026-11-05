import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteOrder, type SampleOrder } from '@/entities/order'
import { ApiError } from '@/shared/api'
import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
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

interface OrderDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: SampleOrder | null
  onCloseAutoFocus?: (event: Event) => void
}

export function OrderDeleteDialog({
  open,
  onOpenChange,
  order,
  onCloseAutoFocus,
}: OrderDeleteDialogProps) {
  const { t } = useTranslation('orderEditor')
  const errorMessage = useErrorMessage()
  const deleteOrder = useDeleteOrder()
  async function handleDelete() {
    if (!order || deleteOrder.isPending) return
    try {
      await deleteOrder.mutateAsync(order.id)
      toast.success(t('delete.success'), {
        description: t('delete.successDescription', { id: order.id }),
      })
      onOpenChange(false)
      deleteOrder.reset()
    } catch {
      // Keep the dialog and error available for an explicit retry.
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (deleteOrder.isPending) return
        deleteOrder.reset()
        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            {t('delete.description', { id: order?.id ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteOrder.error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {deleteOrder.error instanceof ApiError
              ? deleteOrder.error.status === 404
                ? t('notFound')
                : errorMessage(deleteOrder.error)
              : t('delete.error')}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteOrder.isPending}>{t('delete.keep')}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteOrder.isPending || !order}
            onClick={() => {
              void handleDelete()
            }}
          >
            {deleteOrder.isPending && (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {t(deleteOrder.isPending ? 'delete.pending' : 'remove')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
