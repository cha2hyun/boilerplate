import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import {
  currentDemoUserId,
  workspaceUsersQueryOptions,
  workspaceUserStatuses,
  type WorkspaceUser,
} from '@/entities/workspace-user'
import { WorkspaceUserEditorDialog } from '@/features/workspace-user-editor'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/ui/empty'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { ProfileAvatar } from '@/shared/ui/profile-avatar'
import { PageHeader } from '@/shared/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { HStack, VStack } from '@/shared/ui/stack'
import type { UsersSearch } from '../model/search'
import { filterUsers } from '../model/selectors'
import { UserDetailsSheet } from './user-details-sheet'
import { UserStatusBadge } from './user-status-badge'
import { UsersQueryAlert } from './users-query-alert'

interface UsersPageProps {
  search: UsersSearch
  onSearchChange: SearchChange<UsersSearch>
}

export function UsersPage({ search, onSearchChange }: UsersPageProps) {
  const { t } = useTranslation('workspaceUsers')
  const { t: admin } = useTranslation('admin')
  const { formatNumber } = useFormatters()
  const query = useQuery(workspaceUsersQueryOptions())
  const found = filterUsers(query.data ?? [], search)
  const searchRef = useRef<HTMLInputElement>(null)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const editorTrigger = useRef<HTMLButtonElement | null>(null)
  const createdId = useRef<string | null>(null)
  const [editor, setEditor] = useState<{ origin: UsersSearch; user?: WorkspaceUser } | null>(null)
  // A confirmed history navigation discards the editor owned by the previous location.
  if (
    editor &&
    (editor.origin.id !== search.id ||
      editor.origin.q !== search.q ||
      editor.origin.status !== search.status)
  )
    setEditor(null)

  function openDetails(id: string, trigger: HTMLButtonElement | null) {
    detailTrigger.current = trigger
    onSearchChange({ id })
  }
  function openEditor(trigger: HTMLButtonElement, user?: WorkspaceUser) {
    editorTrigger.current = trigger
    setEditor({ origin: search, user })
  }
  function restoreEditorFocus(event: Event) {
    event.preventDefault()
    const id = createdId.current
    createdId.current = null
    if (id) openDetails(id, editorTrigger.current)
    else (editorTrigger.current?.isConnected ? editorTrigger.current : searchRef.current)?.focus()
  }
  return (
    <VStack data-slot="page-content" align="stretch" className="min-w-0 gap-6">
      <PageHeader
        title={t('title')}
        description={t('intro')}
        badgeLabel={admin('common.sample')}
        actions={
          <Button
            className="h-auto min-h-9 max-w-full whitespace-normal"
            onClick={(event) => {
              openEditor(event.currentTarget)
            }}
          >
            <UserPlus aria-hidden="true" />
            {t('invite')}
          </Button>
        }
      />
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle asChild>
            <h2>{t('directory')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VStack align="stretch" className="min-w-0 gap-4">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(9rem,14rem)]">
              <VStack align="stretch" className="min-w-0 gap-2">
                <Label htmlFor="users-search">{t('search')}</Label>
                <Input
                  id="users-search"
                  ref={searchRef}
                  type="search"
                  placeholder={t('searchHint')}
                  maxLength={200}
                  value={search.q}
                  onChange={(event) => {
                    onSearchChange({ q: event.target.value }, { replace: true })
                  }}
                />
              </VStack>
              <VStack align="stretch" className="min-w-0 gap-2">
                <Label htmlFor="users-status">{t('filterStatus')}</Label>
                <Select
                  value={search.status}
                  onValueChange={(value) => {
                    const status = (['all', ...workspaceUserStatuses] as const).find(
                      (candidate) => candidate === value,
                    )
                    if (status) onSearchChange({ status })
                  }}
                >
                  <SelectTrigger
                    id="users-status"
                    className="h-auto min-h-9 w-full whitespace-normal"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                    {workspaceUserStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </VStack>
            </div>
            <HStack wrap justify="between" className="min-w-0 gap-2">
              {query.data && (
                <p aria-live="polite" className="text-sm text-muted-foreground">
                  {t('resultCount', { total: formatNumber(found.length) })}
                </p>
              )}
              {(search.q || search.status !== 'all') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSearchChange({ q: '', status: 'all' })
                    searchRef.current?.focus()
                  }}
                >
                  {t('reset')}
                </Button>
              )}
            </HStack>
            {query.isError && (
              <UsersQueryAlert
                heading={t(query.data ? 'refreshError' : 'loadError')}
                error={query.error}
                retry={() => void query.refetch()}
              />
            )}
            {query.isPending && (
              <VStack align="stretch" className="gap-3" aria-busy="true">
                <span className="sr-only" role="status">
                  {t('loading')}
                </span>
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-14 w-full" />
                ))}
              </VStack>
            )}
            {query.data &&
              (found.length ? (
                <>
                  <div
                    aria-hidden="true"
                    className="hidden gap-3 text-sm text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_minmax(6rem,.28fr)_minmax(6rem,.28fr)]"
                  >
                    <span>{t('identity')}</span>
                    <span>{t('fields.role')}</span>
                    <span>{t('fields.status')}</span>
                  </div>
                  <ul aria-label={t('directory')} className="divide-y border-y">
                    {found.map((user) => (
                      <li
                        key={user.id}
                        className="grid min-w-0 gap-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(6rem,.28fr)_minmax(6rem,.28fr)] md:items-center"
                      >
                        <HStack className="min-w-0 gap-3">
                          <ProfileAvatar name={user.name} src={user.avatarUrl} />
                          <VStack align="start" className="min-w-0 gap-1">
                            <HStack wrap className="min-w-0 gap-2">
                              <Button
                                variant="link"
                                className="h-auto max-w-full min-w-0 justify-start p-0 text-left wrap-anywhere whitespace-normal underline underline-offset-4"
                                onClick={(event) => {
                                  openDetails(user.id, event.currentTarget)
                                }}
                              >
                                {user.name}
                              </Button>
                              {user.id === currentDemoUserId && (
                                <Badge variant="context">{t('self')}</Badge>
                              )}
                            </HStack>
                            <p className="min-w-0 text-sm wrap-anywhere text-muted-foreground">
                              {user.email}
                            </p>
                          </VStack>
                        </HStack>
                        <div className="text-sm wrap-anywhere">
                          <span className="text-muted-foreground md:sr-only">
                            {t('fields.role')}{' '}
                          </span>
                          {t(`roles.${user.role}`)}
                        </div>
                        <div>
                          <span className="sr-only">{t('fields.status')} </span>
                          <UserStatusBadge status={user.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t(query.data.length ? 'noMatches' : 'empty')}</EmptyTitle>
                    <EmptyDescription>
                      {t(query.data.length ? 'noMatchesHint' : 'emptyHint')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ))}
          </VStack>
        </CardContent>
      </Card>
      <UserDetailsSheet
        id={search.id}
        onClose={() => {
          onSearchChange({ id: '' })
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          ;(detailTrigger.current?.isConnected ? detailTrigger.current : searchRef.current)?.focus()
        }}
        onEdit={(user, trigger) => {
          openEditor(trigger, user)
        }}
      />
      {editor && (
        <WorkspaceUserEditorDialog
          user={editor.user}
          onClose={() => {
            setEditor(null)
          }}
          onSaved={(user) => {
            if (!editor.user) createdId.current = user.id
            setEditor(null)
          }}
          onCloseAutoFocus={restoreEditorFocus}
        />
      )}
    </VStack>
  )
}
