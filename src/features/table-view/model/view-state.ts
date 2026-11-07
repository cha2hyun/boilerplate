import { z } from 'zod'

export type TableId = 'projects' | 'orders' | 'customers'
export type TablePin = 'left' | 'right' | false
export interface TableViewColumn {
  id: string
  label: string
  width: number
  minWidth?: number
  maxWidth?: number
  hideable?: boolean
  locked?: boolean
  pin?: TablePin
}

const columnIds = z.array(z.string().min(1).max(80)).max(32)
export const tableViewStateSchema = z.object({
  density: z.enum(['compact', 'default', 'comfortable']),
  columnOrder: columnIds,
  columnSizing: z.record(z.string(), z.number().int().min(48).max(960)),
  columnVisibility: z.record(z.string(), z.boolean()),
  columnPinning: z.object({ left: columnIds, right: columnIds }),
})
export type TableViewState = z.infer<typeof tableViewStateSchema>

export function columnWidth(column: TableViewColumn, value = column.width) {
  if (column.locked) return column.width
  return Math.round(Math.min(column.maxWidth ?? 640, Math.max(column.minWidth ?? 96, value)))
}

/** Reconcile saved UI choices against current columns; storage never defines the schema. */
export function normalizeTableView(
  columns: TableViewColumn[],
  saved?: TableViewState,
): TableViewState {
  const ids = columns.map((column) => column.id)
  const byId = new Map(columns.map((column) => [column.id, column]))
  const uniqueKnown = (values: string[]) => [...new Set(values)].filter((id) => byId.has(id))
  const columnOrder = uniqueKnown([...(saved?.columnOrder ?? []), ...ids])
  const columnSizing: Record<string, number> = {}
  const columnVisibility: Record<string, boolean> = {}
  for (const column of columns) {
    const size = saved?.columnSizing[column.id]
    if (!column.locked && size !== undefined) columnSizing[column.id] = columnWidth(column, size)
    columnVisibility[column.id] =
      column.locked || column.hideable === false
        ? true
        : (saved?.columnVisibility[column.id] ?? true)
  }
  if (!columns.some((column) => !column.locked && columnVisibility[column.id])) {
    const first = columns.find((column) => !column.locked)
    if (first) columnVisibility[first.id] = true
  }
  const defaults = (side: 'left' | 'right') =>
    columns.filter((column) => column.pin === side).map((column) => column.id)
  const mutable = (values: string[]) => uniqueKnown(values).filter((id) => !byId.get(id)?.locked)
  const left = [
    ...columns
      .filter((column) => column.locked && column.pin === 'left')
      .map((column) => column.id),
    ...mutable(saved?.columnPinning.left ?? defaults('left')),
  ]
  const right = [
    ...mutable(saved?.columnPinning.right ?? defaults('right')).filter((id) => !left.includes(id)),
    ...columns
      .filter((column) => column.locked && column.pin === 'right')
      .map((column) => column.id),
  ]
  return {
    density: saved?.density ?? 'default',
    columnOrder,
    columnSizing,
    columnVisibility,
    columnPinning: { left, right },
  }
}

export function orderedColumns(columns: TableViewColumn[], state: TableViewState) {
  const { left, right } = state.columnPinning
  const middle = state.columnOrder.filter((id) => !left.includes(id) && !right.includes(id))
  const byId = new Map(columns.map((column) => [column.id, column]))
  return [...left, ...middle, ...right].flatMap((id) => {
    const column = byId.get(id)
    return column ? [column] : []
  })
}
