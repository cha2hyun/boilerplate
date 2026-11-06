import { Pencil } from 'lucide-react'
import type { Project } from '@/entities/project'
import { useErrorMessage, useFormatters, useTranslation } from '@/shared/lib/i18n'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { Progress } from '@/shared/ui/progress'
import { Separator } from '@/shared/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import { RouterTextLink } from '@/shared/ui/text-link'
import type { ProjectTableSearch } from '../model/search'
import { ProjectStatusBadge } from './project-status-badge'

interface ProjectDetailsSheetProps {
  open: boolean
  project: Project | undefined
  search: ProjectTableSearch
  isLoading: boolean
  error?: Error | null
  onRetry?: () => void
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: Event) => void
  onEdit: (project: Project, trigger: HTMLButtonElement) => void
}

export function ProjectDetailsSheet({
  open,
  project,
  search,
  isLoading,
  error,
  onRetry,
  onOpenChange,
  onCloseAutoFocus,
  onEdit,
}: ProjectDetailsSheetProps) {
  const { t } = useTranslation('workspace')
  const { t: admin } = useTranslation('admin')
  const { formatDate, formatNumber } = useFormatters()
  const errorMessage = useErrorMessage()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full overflow-y-auto md:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader className="border-b p-6 pr-12">
          <SheetTitle className="wrap-anywhere">
            {project?.name ?? t('projects.details')}
          </SheetTitle>
          {project ? (
            <SheetDescription>
              {t('projects.updatedOn', {
                date: formatDate(project.updatedAt, { year: 'numeric' }),
              })}
            </SheetDescription>
          ) : (
            <SheetDescription role={isLoading ? 'status' : 'alert'}>
              {isLoading ? t('table.loading') : error ? errorMessage(error) : t('projects.missing')}
            </SheetDescription>
          )}
        </SheetHeader>
        {project ? (
          <VStack align="stretch" className="min-w-0 gap-6 px-6 pb-6 text-sm wrap-anywhere">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{t('table.refreshError')}</AlertTitle>
                <AlertDescription>
                  <p>{errorMessage(error)}</p>
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      {t('common.retry')}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <HStack wrap className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  onEdit(project, event.currentTarget)
                }}
              >
                <Pencil aria-hidden="true" />
                {t('common.editProject')}
              </Button>
              <RouterTextLink to="/projects" search={search} target="_blank">
                {admin('common.openDetailLink')}
              </RouterTextLink>
            </HStack>
            <VStack asChild align="stretch" className="gap-3">
              <dl>
                <HStack justify="between" wrap className="gap-2">
                  <dt className="text-muted-foreground">{t('common.status')}</dt>
                  <dd>
                    <ProjectStatusBadge status={project.status} />
                  </dd>
                </HStack>
                <HStack justify="between" wrap className="gap-2">
                  <dt className="text-muted-foreground">{t('table.progress')}</dt>
                  <HStack asChild className="min-w-0 gap-2">
                    <dd>
                      <Progress
                        aria-label={t('table.projectProgress', { name: project.name })}
                        value={project.progress}
                        className="h-2 w-20"
                      />
                      <span className="tabular-nums">
                        {formatNumber(project.progress, {
                          style: 'percent',
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </dd>
                  </HStack>
                </HStack>
              </dl>
            </VStack>
            <Separator />
            <VStack asChild align="stretch" className="gap-2">
              <section>
                <h2 className="font-medium">{t('editor.description')}</h2>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {project.description || t('table.noDescription')}
                </p>
              </section>
            </VStack>
            <Separator />
            <VStack asChild align="stretch" className="gap-3">
              <section>
                <h2 className="font-medium">{t('table.owner')}</h2>
                <HStack className="gap-3">
                  <ProfileAvatar
                    name={project.owner.name}
                    src={project.owner.avatarUrl}
                    initials={project.owner.initials}
                    className="shrink-0"
                  />
                  <VStack align="stretch" className="min-w-0 gap-0.5">
                    <p className="font-medium">{project.owner.name}</p>
                    <p className="text-muted-foreground">{project.owner.email}</p>
                  </VStack>
                </HStack>
              </section>
            </VStack>
          </VStack>
        ) : (
          <VStack align="stretch" className="gap-4 px-6 pb-6">
            {isLoading && <Skeleton aria-hidden="true" className="h-16 w-full" />}
            {error && onRetry && (
              <Button variant="outline" onClick={onRetry}>
                {t('common.retry')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {admin('common.backToList')}
            </Button>
          </VStack>
        )}
      </SheetContent>
    </Sheet>
  )
}
