import { useState } from 'react'
import type { TableColumnLayout } from '@/shared/ui/table'
import { useTableViewStore } from './store'
import {
  columnWidth,
  normalizeTableView,
  orderedColumns,
  type TableId,
  type TablePin,
  type TableViewColumn,
  type TableViewState,
} from './view-state'

export function useTableView(tableId: TableId, definitions: TableViewColumn[]) {
  const saved = useTableViewStore((store) => store.views[tableId])
  // Drag previews are transient; localStorage is written only when the gesture finishes.
  const [preview, setPreview] = useState<{ id: string; width: number } | null>(null)
  const state = normalizeTableView(definitions, saved)
  const columns = orderedColumns(definitions, state)
  const visibleColumns = columns.filter((column) => state.columnVisibility[column.id])
  const getWidth = (id: string) => {
    const column = definitions.find((candidate) => candidate.id === id)
    if (!column) return 0
    return preview?.id === id ? preview.width : (state.columnSizing[id] ?? column.width)
  }
  const getPin = (id: string): TablePin =>
    state.columnPinning.left.includes(id)
      ? 'left'
      : state.columnPinning.right.includes(id)
        ? 'right'
        : false
  const getLayout = (id: string): TableColumnLayout => {
    const pin = getPin(id)
    const group = visibleColumns.filter((column) => getPin(column.id) === pin)
    const index = group.findIndex((column) => column.id === id)
    const preceding = pin === 'right' ? group.slice(index + 1) : group.slice(0, index)
    return {
      pin,
      offset: pin ? preceding.reduce((sum, column) => sum + getWidth(column.id), 0) : 0,
      edge: pin === 'left' ? index === group.length - 1 : pin === 'right' && index === 0,
    }
  }
  const update = (change: (current: TableViewState) => TableViewState) => {
    const current = normalizeTableView(definitions, useTableViewStore.getState().views[tableId])
    useTableViewStore.getState().save(tableId, normalizeTableView(definitions, change(current)))
  }
  const setWidth = (id: string, value: number) => {
    const column = definitions.find((candidate) => candidate.id === id)
    if (!column || column.locked || !Number.isFinite(value)) return
    update((current) => ({
      ...current,
      columnSizing: { ...current.columnSizing, [id]: columnWidth(column, value) },
    }))
  }
  const reorder = (id: string, targetId: string) => {
    const column = definitions.find((candidate) => candidate.id === id)
    const target = definitions.find((candidate) => candidate.id === targetId)
    if (!column || !target || column.locked || target.locked || getPin(id) !== getPin(targetId))
      return
    update((current) => {
      const pin = getPin(id)
      const order = [...(pin ? current.columnPinning[pin] : current.columnOrder)]
      const from = order.indexOf(id)
      const to = order.indexOf(targetId)
      if (from < 0 || to < 0) return current
      order.splice(from, 1)
      order.splice(to, 0, id)
      return pin
        ? { ...current, columnPinning: { ...current.columnPinning, [pin]: order } }
        : { ...current, columnOrder: order }
    })
  }
  const neighbor = (id: string, direction: -1 | 1) => {
    const group = columns.filter((column) => !column.locked && getPin(column.id) === getPin(id))
    return group[group.findIndex((column) => column.id === id) + direction]
  }

  return {
    tableId,
    columns,
    visibleColumns,
    density: state.density,
    state,
    columnWidths: visibleColumns.map((column) => getWidth(column.id)),
    pinnedWidth: visibleColumns.reduce(
      (sum, column) => sum + (getPin(column.id) ? getWidth(column.id) : 0),
      0,
    ),
    getWidth,
    getLayout,
    getPin,
    setWidth,
    reorder,
    canMove: (id: string, direction: -1 | 1) => Boolean(neighbor(id, direction)),
    move: (id: string, direction: -1 | 1) => {
      const target = neighbor(id, direction)
      if (target) reorder(id, target.id)
    },
    setDensity: (density: TableViewState['density']) => {
      update((current) => ({ ...current, density }))
    },
    setVisibility: (id: string, visible: boolean) => {
      update((current) => ({
        ...current,
        columnVisibility: { ...current.columnVisibility, [id]: visible },
      }))
    },
    setPin: (id: string, pin: TablePin) => {
      const column = definitions.find((candidate) => candidate.id === id)
      if (!column || column.locked) return
      update((current) => {
        const left = current.columnPinning.left.filter((item) => item !== id)
        const right = current.columnPinning.right.filter((item) => item !== id)
        if (pin === 'left') left.push(id)
        if (pin === 'right') right.unshift(id)
        return { ...current, columnPinning: { left, right } }
      })
    },
    previewWidth: (id: string, value: number) => {
      const column = definitions.find((candidate) => candidate.id === id)
      if (column && !column.locked) setPreview({ id, width: columnWidth(column, value) })
    },
    clearPreview: () => {
      setPreview(null)
    },
    reset: () => {
      setPreview(null)
      useTableViewStore.getState().reset(tableId)
    },
  }
}

export type TableView = ReturnType<typeof useTableView>
