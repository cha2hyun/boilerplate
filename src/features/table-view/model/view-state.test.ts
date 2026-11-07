import { describe, expect, it } from 'vitest'
import {
  normalizeTableView,
  orderedColumns,
  tableViewStateSchema,
  type TableViewColumn,
  type TableViewState,
} from './view-state'

const columns: TableViewColumn[] = [
  { id: 'select', label: 'Selection', width: 48, locked: true, pin: 'left' },
  { id: 'id', label: 'Order', width: 168, minWidth: 128, hideable: false, pin: 'left' },
  { id: 'customer', label: 'Customer', width: 240, minWidth: 160, maxWidth: 360 },
  { id: 'total', label: 'Total', width: 136, minWidth: 120, maxWidth: 480 },
  { id: 'actions', label: 'Actions', width: 64, locked: true, pin: 'right' },
]

function createView(overrides: Partial<TableViewState> = {}): TableViewState {
  return tableViewStateSchema.parse({
    density: 'default',
    columnOrder: columns.map((column) => column.id),
    columnSizing: {},
    columnVisibility: {},
    columnPinning: { left: ['select', 'id'], right: ['actions'] },
    ...overrides,
  })
}

describe('table view reconciliation', () => {
  it('uses current defaults when the table has no saved settings', () => {
    const state = normalizeTableView(columns)
    expect(state.density).toBe('default')
    expect(state.columnSizing).toEqual({})
    expect(state.columnPinning).toEqual({ left: ['select', 'id'], right: ['actions'] })
    expect(orderedColumns(columns, state).map((column) => column.id)).toEqual([
      'select',
      'id',
      'customer',
      'total',
      'actions',
    ])
    expect(Object.values(state.columnVisibility).every(Boolean)).toBe(true)
  })

  it('drops removed and repeated IDs, adds new columns, and retains valid user choices', () => {
    const saved = createView({
      density: 'comfortable',
      columnOrder: ['retired', 'total', 'total', 'id', 'actions', 'select'],
      columnSizing: { retired: 200, customer: 280 },
      columnVisibility: { retired: false, customer: false },
      columnPinning: {
        left: ['retired', 'customer', 'customer', 'actions'],
        right: ['customer', 'total', 'actions', 'select'],
      },
    })
    const before = structuredClone(saved)
    const currentColumns = [...columns, { id: 'date', label: 'Date', width: 160, minWidth: 144 }]
    const state = normalizeTableView(currentColumns, saved)

    expect(state.columnOrder).toEqual(['total', 'id', 'actions', 'select', 'customer', 'date'])
    expect(state.columnSizing).toEqual({ customer: 280 })
    expect(state.columnVisibility.customer).toBe(false)
    expect(state.columnVisibility.date).toBe(true)
    expect(state.columnVisibility).not.toHaveProperty('retired')
    expect(state.columnPinning).toEqual({
      left: ['select', 'customer'],
      right: ['total', 'actions'],
    })
    expect(orderedColumns(currentColumns, state).map((column) => column.id)).toEqual([
      'select',
      'customer',
      'id',
      'date',
      'total',
      'actions',
    ])
    expect(state.density).toBe('comfortable')
    expect(saved).toEqual(before)
  })

  it('restores locked columns and non-hideable identity columns from stale preferences', () => {
    const state = normalizeTableView(
      columns,
      createView({
        columnOrder: ['actions', 'customer', 'total', 'id', 'select'],
        columnVisibility: {
          select: false,
          id: false,
          customer: false,
          total: false,
          actions: false,
        },
        columnSizing: { select: 480, actions: 480, id: 200 },
        columnPinning: { left: ['actions'], right: ['select', 'id'] },
      }),
    )
    expect(state.columnVisibility).toEqual({
      select: true,
      id: true,
      customer: false,
      total: false,
      actions: true,
    })
    expect(state.columnSizing).toEqual({ id: 200 })
    expect(state.columnPinning).toEqual({ left: ['select'], right: ['id', 'actions'] })
    expect(orderedColumns(columns, state).map((column) => column.id)).toEqual([
      'select',
      'customer',
      'total',
      'id',
      'actions',
    ])
  })

  it('keeps at least one data column visible when every optional column was hidden', () => {
    const optionalColumns = columns.filter((column) => column.id !== 'id')
    const state = normalizeTableView(
      optionalColumns,
      createView({ columnVisibility: { customer: false, total: false } }),
    )
    expect(state.columnVisibility.customer).toBe(true)
    expect(state.columnVisibility.total).toBe(false)
    expect(state.columnVisibility.actions).toBe(true)
  })

  it('clamps saved widths to the current readable minimum and maximum', () => {
    const state = normalizeTableView(
      columns,
      createView({ columnSizing: { id: 48, customer: 960, total: 48 } }),
    )
    expect(state.columnSizing).toEqual({ id: 128, customer: 360, total: 120 })
  })

  it('uses the pin group order independently from the center column order', () => {
    const state = normalizeTableView(
      columns,
      createView({
        columnOrder: ['total', 'id', 'customer', 'actions', 'select'],
        columnPinning: { left: ['customer', 'id'], right: [] },
      }),
    )
    expect(orderedColumns(columns, state).map((column) => column.id)).toEqual([
      'select',
      'customer',
      'id',
      'total',
      'actions',
    ])
  })
})

describe('table view input validation', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, 47, 961, 120.5])(
    'rejects an invalid persisted width %s',
    (width) => {
      expect(
        tableViewStateSchema.safeParse({ ...createView(), columnSizing: { customer: width } })
          .success,
      ).toBe(false)
    },
  )

  it('rejects unknown density, non-boolean visibility, and excessive column counts', () => {
    expect(tableViewStateSchema.safeParse({ ...createView(), density: 'tiny' }).success).toBe(false)
    expect(
      tableViewStateSchema.safeParse({ ...createView(), columnVisibility: { customer: 'false' } })
        .success,
    ).toBe(false)
    expect(
      tableViewStateSchema.safeParse({
        ...createView(),
        columnOrder: Array.from({ length: 33 }, (_, index) => `column-${String(index)}`),
      }).success,
    ).toBe(false)
  })
})
