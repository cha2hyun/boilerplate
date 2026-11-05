import { ordersQueryOptions, type SampleOrder } from '@/entities/order'
import { OrderDeleteDialog, OrderEditorDialog } from '@/features/order-editor'
import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { VStack } from '@/shared/ui/stack'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrdersSearch } from '../model/search'
import { selectOrders } from '../model/selectors'
import { OrderDetailsSheet } from './order-details-sheet'
import { OrdersList } from './orders-list'
import { OrdersSummary } from './orders-summary'

interface OrdersPageProps {
  search: OrdersSearch
  onSearchChange: SearchChange<OrdersSearch>
}

export function OrdersPage({ search, onSearchChange }: OrdersPageProps) {
  const { t } = useTranslation('admin')
  const { t: editor } = useTranslation('orderEditor')
  const errorMessage = useErrorMessage()
  const query = useQuery(ordersQueryOptions())
  const { q, status, sort, page, pageSize } = search
  const selection = useMemo(
    () => selectOrders(query.data ?? [], { q, status, sort, page, pageSize }),
    [query.data, q, status, sort, page, pageSize],
  )
  const isLoading = query.isPending && !query.data
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [editSession, setEditSession] = useState<{
    record: SampleOrder
    detail: string
  } | null>(null)
  const editingOrder = editSession?.detail === search.detail ? editSession.record : null
  // Approved history navigation must also dismiss the editor owned by the previous detail.
  if (editSession && editSession.detail !== search.detail) setEditSession(null)

  function setEditingOrder(record: SampleOrder | null) {
    setEditSession(record ? { record, detail: search.detail } : null)
  }
  const [deletingOrder, setDeletingOrder] = useState<SampleOrder | null>(null)
  const selected = query.data?.find((item) => item.id === search.detail)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const actionTrigger = useRef<HTMLButtonElement | null>(null)
  const savedId = useRef<string | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (
      query.isSuccess &&
      !query.isFetching &&
      !creatingOrder &&
      !editingOrder &&
      !deletingOrder &&
      search.page > selection.pageCount
    ) {
      onSearchChange({ page: selection.pageCount }, { replace: true })
    }
  }, [
    query.isSuccess,
    query.isFetching,
    creatingOrder,
    editingOrder,
    deletingOrder,
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
        title={t('orders.title')}
        description={t('orders.intro')}
        badgeLabel={t('common.sample')}
        actions={
          <Button
            onClick={(event) => {
              actionTrigger.current = event.currentTarget
              setCreatingOrder(true)
            }}
          >
            <Plus aria-hidden="true" />
            {editor('newOrder')}
          </Button>
        }
      />
      {query.isError && query.data && (
        <Alert variant="destructive">
          <AlertTitle>{t('orders.refreshError')}</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(query.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              {t('common.tryAgain')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <OrdersSummary
        orders={query.data ?? []}
        isLoading={isLoading}
        hasData={query.data !== undefined}
      />
      <OrdersList
        search={search}
        onSearchChange={onSearchChange}
        orders={query.data ?? []}
        selection={selection}
        isLoading={isLoading}
        hasLoadError={query.isError && !query.data}
        error={query.error}
        onRetry={() => void query.refetch()}
        searchRef={searchRef}
        actionTrigger={actionTrigger}
        hasOpenDialog={Boolean(search.detail) || editingOrder !== null || deletingOrder !== null}
        onView={openDetails}
        onEdit={setEditingOrder}
        onDelete={setDeletingOrder}
      />
      <OrderDetailsSheet
        open={Boolean(search.detail)}
        order={selected}
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
          setEditingOrder(record)
        }}
      />
      <OrderEditorDialog
        open={creatingOrder || Boolean(editingOrder)}
        order={editingOrder ?? undefined}
        onSaved={(order) => {
          if (creatingOrder) savedId.current = order.id
        }}
        onCloseAutoFocus={restoreActionFocus}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingOrder(false)
            setEditingOrder(null)
          }
        }}
      />
      <OrderDeleteDialog
        open={Boolean(deletingOrder)}
        order={deletingOrder}
        onCloseAutoFocus={restoreActionFocus}
        onOpenChange={(open) => {
          if (!open) setDeletingOrder(null)
        }}
      />
    </VStack>
  )
}
