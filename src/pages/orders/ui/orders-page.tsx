import {
  ordersQueryOptions,
  orderDetailQueryOptions,
  orderSummaryQueryOptions,
  type SampleOrder,
} from '@/entities/order'
import { OrderDeleteDialog, OrderEditorDialog } from '@/features/order-editor'
import { useErrorMessage, useTranslation } from '@/shared/lib/i18n'
import type { SearchChange } from '@/shared/lib/search-params'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { VStack } from '@/shared/ui/stack'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const query = useQuery(ordersQueryOptions(search))
  const summary = useQuery(orderSummaryQueryOptions())
  const detail = useQuery(orderDetailQueryOptions(search.detail))
  const selection = selectOrders(query.data)
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
  const selected = detail.data ?? undefined
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
      search.page !== query.data.page
    ) {
      onSearchChange({ page: query.data.page }, { replace: true })
    }
  }, [
    query.isSuccess,
    query.isFetching,
    creatingOrder,
    editingOrder,
    deletingOrder,
    search.page,
    query.data,
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
      {summary.isError && (
        <Alert variant="destructive">
          <AlertTitle>{t('orders.summaryError')}</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(summary.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void summary.refetch()}>
              {t('common.tryAgain')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <OrdersSummary
        summary={summary.data}
        isLoading={summary.isPending && !summary.data}
        hasData={summary.data !== undefined}
      />
      <OrdersList
        search={search}
        onSearchChange={onSearchChange}
        totalOrders={summary.data?.total}
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
        isLoading={detail.isPending && !detail.data}
        error={detail.error}
        onRetry={() => void detail.refetch()}
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
