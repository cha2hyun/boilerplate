import { ApiError } from '@/shared/api'
import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteProject, type Project } from '@/entities/project'
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

interface ProjectDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onCloseAutoFocus?: (event: Event) => void
}

export function ProjectDeleteDialog({
  open,
  onOpenChange,
  project,
  onCloseAutoFocus,
}: ProjectDeleteDialogProps) {
  const { t } = useTranslation('workspace')
  const errorMessage = useErrorMessage()
  const deleteProject = useDeleteProject()

  function handleOpenChange(nextOpen: boolean) {
    if (deleteProject.isPending) return
    deleteProject.reset()
    onOpenChange(nextOpen)
  }

  async function handleDelete() {
    if (!project || deleteProject.isPending) return
    try {
      await deleteProject.mutateAsync(project.id)
      toast.success(t('delete.success'), {
        description: t('delete.successDescription', { name: project.name }),
      })
      onOpenChange(false)
      deleteProject.reset()
    } catch {
      // The mutation error is shown in the dialog so the user can retry.
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description', { name: project?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteProject.error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {deleteProject.error instanceof ApiError
              ? deleteProject.error.status === 404
                ? t('editor.notFound')
                : errorMessage(deleteProject.error)
              : t('delete.error')}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteProject.isPending}>
            {t('delete.keep')}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              void handleDelete()
            }}
            disabled={deleteProject.isPending || !project}
          >
            {deleteProject.isPending && (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {t(deleteProject.isPending ? 'delete.pending' : 'common.deleteProject')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
