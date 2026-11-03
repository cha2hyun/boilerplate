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
      toast.success('Project deleted', {
        description: `${project.name} was removed from your workspace.`,
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
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{project?.name}</span> will be permanently
            removed from your workspace. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteProject.error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {deleteProject.error instanceof Error
              ? deleteProject.error.message
              : 'Could not delete this project. Please try again.'}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteProject.isPending}>Keep project</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              void handleDelete()
            }}
            disabled={deleteProject.isPending || !project}
          >
            {deleteProject.isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {deleteProject.isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
