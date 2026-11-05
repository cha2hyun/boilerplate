import { useTranslation } from '@/shared/lib/i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
  onCloseAutoFocus: (event: Event) => void
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onCloseAutoFocus,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation('common')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={(event) => {
          // Focus can arrive before Radix installs its new top-layer Escape listener.
          // Handle the focused prompt immediately; settling a request is idempotent.
          if (open && event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onOpenChange(false)
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t('unsaved.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('unsaved.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('unsaved.stay')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            {t('unsaved.discard')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
