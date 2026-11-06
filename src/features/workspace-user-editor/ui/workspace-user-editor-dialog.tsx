import { useId, useLayoutEffect, useRef, useState, type SubmitEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  currentDemoUserId,
  useInviteWorkspaceUser,
  useUpdateWorkspaceUser,
  workspaceRoles,
  workspaceUserInviteSchema,
  workspaceUserStatuses,
  workspaceUserUpdateSchema,
  type WorkspaceUser,
} from '@/entities/workspace-user'
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

type Field = 'name' | 'email' | 'role' | 'status'
type FieldErrors = Partial<Record<Field, Field | 'duplicate'>>

interface EditorProps {
  user?: WorkspaceUser
  onClose: () => void
  onSaved: (user: WorkspaceUser) => void
  onCloseAutoFocus: (event: Event) => void
}

export function WorkspaceUserEditorDialog({
  user,
  onClose,
  onSaved,
  onCloseAutoFocus,
}: EditorProps) {
  const { t } = useTranslation('workspaceUsers')
  const errorMessage = useErrorMessage()
  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const roleRef = useRef<HTMLButtonElement>(null)
  const submitting = useRef(false)
  const nextFocus = useRef<Field | null>(null)
  const invite = useInviteWorkspaceUser()
  const update = useUpdateWorkspaceUser()
  const pending = invite.isPending || update.isPending
  const [initial] = useState(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'member',
    status: user?.status ?? 'invited',
  }))
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saveError, setSaveError] = useState<Error | null>(null)
  const dirty =
    draft.name !== initial.name ||
    draft.email !== initial.email ||
    draft.role !== initial.role ||
    draft.status !== initial.status
  const protection = useUnsavedChanges({ dirty, pending, focusRef: user ? roleRef : nameRef })
  useLayoutEffect(() => {
    if (pending || !nextFocus.current) return
    document.getElementById(`${formId}-${nextFocus.current}`)?.focus()
    nextFocus.current = null
  }, [errors, pending, formId])

  function change<Key extends Field>(field: Key, value: (typeof draft)[Key]) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(null)
  }

  async function close() {
    if (!submitting.current && (await protection.requestLeave())) onClose()
  }

  function invalid(issues: { path: PropertyKey[] }[]) {
    const next: FieldErrors = {}
    for (const {
      path: [key],
    } of issues) {
      if (key === 'name' || key === 'email' || key === 'role' || key === 'status') next[key] = key
    }
    nextFocus.current = (Object.keys(next) as Field[])[0] ?? null
    setErrors(next)
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || submitting.current || user?.id === currentDemoUserId) return
    setErrors({})
    setSaveError(null)
    submitting.current = true
    try {
      let saved: WorkspaceUser
      if (user) {
        const parsed = workspaceUserUpdateSchema.safeParse({
          role: draft.role,
          status: draft.status,
        })
        if (!parsed.success) {
          invalid(parsed.error.issues)
          return
        }
        saved = await update.mutateAsync({ id: user.id, input: parsed.data })
      } else {
        const parsed = workspaceUserInviteSchema.safeParse({
          name: draft.name,
          email: draft.email,
          role: draft.role,
        })
        if (!parsed.success) {
          invalid(parsed.error.issues)
          return
        }
        saved = await invite.mutateAsync(parsed.data)
      }
      protection.markSaved()
      toast.success(t(user ? 'updated' : 'invited'))
      onSaved(saved)
    } catch (error) {
      if (!user && error instanceof ApiError && error.status === 409 && !error.mayHaveSucceeded) {
        nextFocus.current = 'email'
        setErrors({ email: 'duplicate' })
      } else {
        setSaveError(error instanceof Error ? error : new Error())
      }
    } finally {
      submitting.current = false
    }
  }

  function fieldProps(field: Field) {
    return {
      id: `${formId}-${field}`,
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? `${formId}-${field}-error` : undefined,
    }
  }
  function fieldError(field: Field) {
    const key = errors[field]
    return (
      key && (
        <p id={`${formId}-${field}-error`} role="alert" className="text-sm text-destructive">
          {t(`errors.${key}`)}
        </p>
      )
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close()
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-lg"
        showCloseButton={!pending}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{t(user ? 'edit' : 'invite')}</DialogTitle>
          <DialogDescription className="wrap-anywhere">
            {user ? t('editHint', { name: user.name }) : t('inviteHint')}
          </DialogDescription>
        </DialogHeader>
        <VStack asChild align="stretch" className="min-w-0 gap-5">
          <form
            onSubmit={(event) => {
              void submit(event)
            }}
            noValidate
            aria-busy={pending}
          >
            {!user &&
              (['name', 'email'] as const).map((field) => (
                <VStack key={field} align="stretch" className="gap-2">
                  <Label htmlFor={`${formId}-${field}`}>{t(`fields.${field}`)}</Label>
                  <Input
                    {...fieldProps(field)}
                    ref={field === 'name' ? nameRef : undefined}
                    type={field === 'email' ? 'email' : 'text'}
                    autoComplete="off"
                    value={draft[field]}
                    disabled={pending}
                    onChange={(event) => {
                      change(field, event.target.value)
                    }}
                  />
                  {fieldError(field)}
                </VStack>
              ))}
            <VStack align="stretch" className="gap-2">
              <Label htmlFor={`${formId}-role`}>{t('fields.role')}</Label>
              <Select
                value={draft.role}
                disabled={pending}
                onValueChange={(value) => {
                  const role = workspaceRoles.find((entry) => entry === value)
                  if (role) change('role', role)
                }}
              >
                <SelectTrigger
                  {...fieldProps('role')}
                  ref={roleRef}
                  className="h-auto min-h-9 w-full whitespace-normal"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaceRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError('role')}
            </VStack>
            {user && (
              <VStack align="stretch" className="gap-2">
                <Label htmlFor={`${formId}-status`}>{t('fields.status')}</Label>
                <Select
                  value={draft.status}
                  disabled={pending}
                  onValueChange={(value) => {
                    const status = workspaceUserStatuses.find((entry) => entry === value)
                    if (status) change('status', status)
                  }}
                >
                  <SelectTrigger
                    {...fieldProps('status')}
                    className="h-auto min-h-9 w-full whitespace-normal"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceUserStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError('status')}
              </VStack>
            )}
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError instanceof ApiError &&
                saveError.status === 403 &&
                !saveError.mayHaveSucceeded
                  ? t('errors.forbidden')
                  : errorMessage(saveError)}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void close()}
                className="h-auto min-h-9 whitespace-normal"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={pending || Boolean(user && !dirty) || user?.id === currentDemoUserId}
                className="h-auto min-h-9 whitespace-normal"
              >
                {pending && (
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                )}
                {t(pending ? 'saving' : user ? 'save' : 'create')}
              </Button>
            </DialogFooter>
            <UnsavedChangesDialog {...protection.dialogProps} />
          </form>
        </VStack>
      </DialogContent>
    </Dialog>
  )
}
