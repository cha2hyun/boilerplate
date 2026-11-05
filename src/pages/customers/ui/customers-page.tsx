import { customersQueryOptions, type SampleCustomer } from '@/entities/customer'
import { CustomerDeleteDialog, CustomerEditorDialog } from '@/features/customer-editor'
import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { VStack } from '@/shared/ui/stack'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CustomersSearch } from '../model/search'
import { selectCustomers } from '../model/selectors'
import { CustomerDetailsSheet } from './customer-details-sheet'
import { CustomersList } from './customers-list'
import { CustomersSummary } from './customers-summary'

interface CustomersPageProps {
  search: CustomersSearch
  onSearchChange: SearchChange<CustomersSearch>
}

export function CustomersPage({ search, onSearchChange }: CustomersPageProps) {
  const { t } = useTranslation('admin')
  const { t: editor } = useTranslation('customerEditor')
  const errorMessage = useErrorMessage()
  const query = useQuery(customersQueryOptions())
  const { q, status, sort, page, pageSize } = search
  const selection = useMemo(
    () => selectCustomers(query.data ?? [], { q, status, sort, page, pageSize }),
    [query.data, q, status, sort, page, pageSize],
  )
  const isLoading = query.isPending && !query.data
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editSession, setEditSession] = useState<{
    record: SampleCustomer
    detail: string
  } | null>(null)
  const editingCustomer = editSession?.detail === search.detail ? editSession.record : null
  // Approved history navigation must also dismiss the editor owned by the previous detail.
  if (editSession && editSession.detail !== search.detail) setEditSession(null)

  function setEditingCustomer(record: SampleCustomer | null) {
    setEditSession(record ? { record, detail: search.detail } : null)
  }
  const [deletingCustomer, setDeletingCustomer] = useState<SampleCustomer | null>(null)
  const selected = query.data?.find((item) => item.id === search.detail)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const actionTrigger = useRef<HTMLButtonElement | null>(null)
  const savedId = useRef<string | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (
      query.isSuccess &&
      !query.isFetching &&
      !isCreateOpen &&
      !editingCustomer &&
      !deletingCustomer &&
      search.page > selection.pageCount
    ) {
      onSearchChange({ page: selection.pageCount }, { replace: true })
    }
  }, [
    query.isSuccess,
    query.isFetching,
    isCreateOpen,
    editingCustomer,
    deletingCustomer,
    search.page,
    selection.pageCount,
    onSearchChange,
  ])

  function openDetails(id: string, trigger: HTMLButtonElement | null) {
    detailTrigger.current = trigger
    onSearchChange({ detail: id })
  }

  function restoreActionFocus(event: Event) {
    event.preventDefault()
    if (savedId.current) {
      openDetails(savedId.current, actionTrigger.current)
      savedId.current = null
      return
    }
    const target = actionTrigger.current?.isConnected ? actionTrigger.current : searchRef.current
    target?.focus()
  }

  return (
    <VStack data-slot="page-content" align="stretch" className="min-w-0 gap-6">
      <PageHeader
        title={t('customers.title')}
        description={t('customers.intro')}
        badgeLabel={t('common.sample')}
        actions={
          <Button
            onClick={(event) => {
              actionTrigger.current = event.currentTarget
              setIsCreateOpen(true)
            }}
          >
            <Plus aria-hidden="true" />
            {editor('newCustomer')}
          </Button>
        }
      />
      {query.isError && query.data && (
        <Alert variant="destructive">
          <AlertTitle>{t('customers.refreshError')}</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(query.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              {t('common.tryAgain')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <CustomersSummary
        customers={query.data ?? []}
        isLoading={isLoading}
        hasData={query.data !== undefined}
      />
      <CustomersList
        search={search}
        onSearchChange={onSearchChange}
        customers={query.data ?? []}
        selection={selection}
        isLoading={isLoading}
        hasLoadError={query.isError && !query.data}
        error={query.error}
        onRetry={() => void query.refetch()}
        searchRef={searchRef}
        actionTrigger={actionTrigger}
        hasOpenDialog={
          Boolean(search.detail) || editingCustomer !== null || deletingCustomer !== null
        }
        onView={openDetails}
        onEdit={setEditingCustomer}
        onDelete={setDeletingCustomer}
      />
      <CustomerDetailsSheet
        open={Boolean(search.detail)}
        customer={selected}
        search={search}
        isLoading={isLoading}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        onOpenChange={(open) => {
          if (!open) onSearchChange({ detail: '' })
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const target = detailTrigger.current?.isConnected
            ? detailTrigger.current
            : searchRef.current
          target?.focus()
        }}
        onEdit={(record, trigger) => {
          actionTrigger.current = trigger
          setEditingCustomer(record)
        }}
      />
      <CustomerEditorDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCloseAutoFocus={restoreActionFocus}
        onCreated={(customer) => {
          savedId.current = customer.id
        }}
      />
      <CustomerEditorDialog
        open={editingCustomer !== null}
        customer={editingCustomer ?? undefined}
        onOpenChange={(open) => {
          if (!open) setEditingCustomer(null)
        }}
        onCloseAutoFocus={restoreActionFocus}
      />
      <CustomerDeleteDialog
        open={Boolean(deletingCustomer)}
        customer={deletingCustomer}
        onCloseAutoFocus={restoreActionFocus}
        onOpenChange={(open) => {
          if (!open) setDeletingCustomer(null)
        }}
      />
    </VStack>
  )
}
