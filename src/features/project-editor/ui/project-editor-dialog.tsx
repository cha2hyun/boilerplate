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
import { ApiError } from '@/shared/api'
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
import { VStack } from '@/shared/ui/stack'
import { Textarea } from '@/shared/ui/textarea'

interface ProjectEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  onCloseAutoFocus?: (event: Event) => void
}

type FieldErrorKey =
  | 'editor.nameTooShort'
  | 'editor.nameTooLong'
  | 'editor.descriptionTooLong'
  | 'editor.invalidStatus'
type FieldErrors = Partial<Record<keyof ProjectInput, FieldErrorKey>>

function ProjectForm({
  project,
  onOpenChange,
  onPendingChange,
}: Pick<ProjectEditorDialogProps, 'project' | 'onOpenChange'> & {
  onPendingChange: (pending: boolean) => void
}) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useFormatters()
  const errorMessage = useErrorMessage()
  const formId = useId()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const [input, setInput] = useState<ProjectInput>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'active',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<Error | null>(null)
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
        if (field in input && !nextErrors[field]) {
          nextErrors[field] =
            field === 'name'
              ? input.name.trim().length < 2
                ? 'editor.nameTooShort'
                : 'editor.nameTooLong'
              : field === 'description'
                ? 'editor.descriptionTooLong'
                : 'editor.invalidStatus'
        }
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
      toast.success(t(project ? 'editor.updated' : 'editor.created'), {
        description: t('editor.ready', { name: result.data.name }),
      })
      onOpenChange(false)
    } catch (error) {
      setServerError(error instanceof Error ? error : new Error())
    } finally {
      onPendingChange(false)
    }
  }

  return (
    <VStack asChild align="stretch" className="gap-5">
      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        noValidate
      >
        <VStack align="stretch" className="gap-2">
          <Label htmlFor={`${formId}-name`}>{t('editor.name')}</Label>
          <Input
            id={`${formId}-name`}
            autoComplete="off"
            placeholder={t('editor.namePlaceholder')}
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
              {t(errors.name)}
            </p>
          )}
        </VStack>
        <VStack align="stretch" className="gap-2">
          <Label htmlFor={`${formId}-description`}>
            {t('editor.description')}{' '}
            <span className="font-normal text-muted-foreground">{t('editor.optional')}</span>
          </Label>
          <Textarea
            id={`${formId}-description`}
            placeholder={t('editor.descriptionPlaceholder')}
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
              {t(errors.description)}
            </p>
          ) : (
            <p id={`${formId}-description-hint`} className="text-xs text-muted-foreground">
              {t('editor.descriptionHint', { limit: formatNumber(240) })}
            </p>
          )}
        </VStack>
        <VStack align="stretch" className="gap-2">
          <Label htmlFor={`${formId}-status`}>{t('common.status')}</Label>
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
              <SelectValue placeholder={t('editor.selectStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t('common.active')}</SelectItem>
              <SelectItem value="paused">{t('common.paused')}</SelectItem>
              <SelectItem value="archived">{t('common.archived')}</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p id={`${formId}-status-error`} role="alert" className="text-sm text-destructive">
              {t(errors.status)}
            </p>
          )}
        </VStack>
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {serverError instanceof ApiError
              ? serverError.status === 404
                ? t('editor.notFound')
                : errorMessage(serverError)
              : t('editor.saveError')}
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
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {t(isPending ? 'editor.saving' : project ? 'common.save' : 'editor.create')}
          </Button>
        </DialogFooter>
      </form>
    </VStack>
  )
}

export function ProjectEditorDialog({
  open,
  onOpenChange,
  project,
  onCloseAutoFocus,
}: ProjectEditorDialogProps) {
  const { t } = useTranslation('workspace')
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
          <DialogTitle>{t(project ? 'common.editProject' : 'editor.createTitle')}</DialogTitle>
          <DialogDescription>
            {t(project ? 'editor.editDescription' : 'editor.createDescription')}
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
