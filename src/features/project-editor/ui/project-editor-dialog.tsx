import { useId, useRef, useState, type SubmitEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  projectInputSchema,
  useCreateProject,
  useUpdateProject,
  type Project,
  type ProjectInput,
} from '@/entities/project'
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
import { Textarea } from '@/shared/ui/textarea'

interface ProjectEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  onCloseAutoFocus?: (event: Event) => void
}

type FieldErrors = Partial<Record<keyof ProjectInput, string>>

function ProjectForm({
  project,
  onOpenChange,
  onPendingChange,
}: Pick<ProjectEditorDialogProps, 'project' | 'onOpenChange'> & {
  onPendingChange: (pending: boolean) => void
}) {
  const formId = useId()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const [input, setInput] = useState<ProjectInput>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'active',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const isPending = createProject.isPending || updateProject.isPending

  function updateField<Key extends keyof ProjectInput>(field: Key, value: ProjectInput[Key]) {
    setInput((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setServerError(null)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const result = projectInputSchema.safeParse(input)
    if (!result.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProjectInput
        if (field in input && !nextErrors[field]) nextErrors[field] = issue.message
      }
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setServerError(null)
    onPendingChange(true)
    try {
      if (project) {
        await updateProject.mutateAsync({ id: project.id, input: result.data })
      } else {
        await createProject.mutateAsync(result.data)
      }
      toast.success(project ? 'Project updated' : 'Project created', {
        description: `${result.data.name} is ready in your workspace.`,
      })
      onOpenChange(false)
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Could not save this project. Please try again.',
      )
    } finally {
      onPendingChange(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
      noValidate
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor={`${formId}-name`}>Project name</Label>
        <Input
          id={`${formId}-name`}
          autoComplete="off"
          placeholder="e.g. Website redesign"
          value={input.name}
          onChange={(event) => {
            updateField('name', event.target.value)
          }}
          disabled={isPending}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
        />
        {errors.name && (
          <p id={`${formId}-name-error`} role="alert" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-description`}>
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${formId}-description`}
          placeholder="What are you working toward?"
          value={input.description}
          onChange={(event) => {
            updateField('description', event.target.value)
          }}
          disabled={isPending}
          rows={3}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={`${formId}-description-${errors.description ? 'error' : 'hint'}`}
        />
        {errors.description ? (
          <p id={`${formId}-description-error`} role="alert" className="text-sm text-destructive">
            {errors.description}
          </p>
        ) : (
          <p id={`${formId}-description-hint`} className="text-xs text-muted-foreground">
            A short summary to keep everyone on the same page. Up to 240 characters.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-status`}>Status</Label>
        <Select
          value={input.status}
          onValueChange={(value) => {
            updateField('status', value as ProjectInput['status'])
          }}
          disabled={isPending}
        >
          <SelectTrigger
            id={`${formId}-status`}
            className="w-full"
            aria-invalid={Boolean(errors.status)}
            aria-describedby={errors.status ? `${formId}-status-error` : undefined}
          >
            <SelectValue placeholder="Select a status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p id={`${formId}-status-error`} role="alert" className="text-sm text-destructive">
            {errors.status}
          </p>
        )}
      </div>
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}
      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            onOpenChange(false)
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {isPending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ProjectEditorDialog({
  open,
  onOpenChange,
  project,
  onCloseAutoFocus,
}: ProjectEditorDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen)
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
          <DialogTitle>{project ? 'Edit project' : 'Create a project'}</DialogTitle>
          <DialogDescription>
            {project
              ? 'Update the details and keep your team in the loop.'
              : 'Give your next big idea a place to take shape.'}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          key={project?.id ?? 'new-project'}
          project={project}
          onOpenChange={onOpenChange}
          onPendingChange={setIsPending}
        />
      </DialogContent>
    </Dialog>
  )
}
