import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { storageKeys } from '@/shared/config/product'
import { i18n } from '@/shared/lib/i18n'
import { createPreferenceStorage } from '@/shared/lib/preference-storage'
import { createTableViewStore, useTableViewStore } from '../model/store'
import { useTableView } from '../model/use-table-view'
import { normalizeTableView, type TableViewColumn } from '../model/view-state'
import { TableViewSettings } from './table-view-settings'

const columns: TableViewColumn[] = [
  { id: 'id', label: 'Order', width: 128, hideable: false, pin: 'left' },
  { id: 'customer', label: 'Customer', width: 240, minWidth: 160, maxWidth: 480 },
  { id: 'total', label: 'Total', width: 136, minWidth: 120 },
  { id: 'actions', label: 'Actions', width: 64, locked: true, pin: 'right' },
]

function Settings() {
  const view = useTableView('orders', columns)
  return <TableViewSettings view={view} />
}

beforeEach(async () => {
  await i18n.changeLanguage('en-US')
  useTableViewStore.setState({ views: {} })
  window.localStorage.removeItem(storageKeys.tableViews)
})

async function openSettings() {
  const user = userEvent.setup()
  render(<Settings />)
  await user.click(screen.getByRole('button', { name: 'View settings' }))
  expect(await screen.findByRole('dialog', { name: 'View settings' })).toBeVisible()
  return user
}

describe('table view settings interactions', () => {
  it('keeps width edits local until Enter commits and leaves keyboard focus in the input', async () => {
    const user = await openSettings()
    const width = screen.getByRole('spinbutton', { name: 'Width of Customer' })
    await user.clear(width)
    await user.type(width, '320')
    expect(useTableViewStore.getState().views.orders).toBeUndefined()
    expect(window.localStorage.getItem(storageKeys.tableViews)).toBeNull()

    await user.keyboard('{Enter}')
    expect(width).toHaveFocus()
    expect(width).toHaveValue(320)
    expect(useTableViewStore.getState().views.orders?.columnSizing.customer).toBe(320)
    expect(
      createTableViewStore(createPreferenceStorage()).getState().views.orders?.columnSizing
        .customer,
    ).toBe(320)
  })

  it('clamps a committed width and restores a cleared draft on blur', async () => {
    const user = await openSettings()
    const width = screen.getByRole('spinbutton', { name: 'Width of Customer' })
    await user.clear(width)
    await user.type(width, '12')
    await user.tab()
    expect(width).toHaveValue(160)
    expect(useTableViewStore.getState().views.orders?.columnSizing.customer).toBe(160)

    const persisted = window.localStorage.getItem(storageKeys.tableViews)
    await user.clear(width)
    await user.tab()
    expect(width).toHaveValue(160)
    expect(window.localStorage.getItem(storageKeys.tableViews)).toBe(persisted)
  })

  it('cancels an uncommitted width with Escape without closing or persisting the draft', async () => {
    useTableViewStore.getState().save('orders', {
      ...normalizeTableView(columns),
      columnSizing: { customer: 272 },
    })
    const persisted = window.localStorage.getItem(storageKeys.tableViews)
    const user = await openSettings()
    const width = screen.getByRole('spinbutton', { name: 'Width of Customer' })
    await user.clear(width)
    await user.type(width, '416')
    await user.keyboard('{Escape}')

    expect(screen.getByRole('dialog', { name: 'View settings' })).toBeVisible()
    expect(width).toHaveFocus()
    expect(width).toHaveValue(272)
    expect(useTableViewStore.getState().views.orders?.columnSizing.customer).toBe(272)
    expect(window.localStorage.getItem(storageKeys.tableViews)).toBe(persisted)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useTableViewStore.getState().views.orders?.columnSizing.customer).toBe(272)
    expect(window.localStorage.getItem(storageKeys.tableViews)).toBe(persisted)
  })

  it('applies visibility immediately and restores only this table before returning focus', async () => {
    useTableViewStore.getState().save('orders', {
      ...normalizeTableView(columns),
      density: 'compact',
      columnVisibility: { customer: false },
      columnSizing: { customer: 320 },
    })
    const customers = { ...normalizeTableView(columns), density: 'comfortable' as const }
    useTableViewStore.getState().save('customers', customers)
    const user = await openSettings()
    const showCustomer = screen.getByRole('checkbox', { name: 'Show Customer' })
    expect(showCustomer).not.toBeChecked()
    await user.click(showCustomer)
    expect(useTableViewStore.getState().views.orders?.columnVisibility.customer).toBe(true)
    expect(
      createTableViewStore(createPreferenceStorage()).getState().views.orders?.columnVisibility
        .customer,
    ).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Restore defaults' }))
    expect(useTableViewStore.getState().views.orders).toBeUndefined()
    expect(useTableViewStore.getState().views.customers).toEqual(customers)
    expect(showCustomer).toBeChecked()
    expect(screen.getByRole('spinbutton', { name: 'Width of Customer' })).toHaveValue(240)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'View settings' })).toHaveFocus())
  })

  it('keeps focus with the moved column when its move control becomes disabled', async () => {
    const user = await openSettings()
    const later = screen.getByRole('button', { name: 'Move Customer later' })
    await user.click(later)
    expect(useTableViewStore.getState().views.orders?.columnOrder).toEqual([
      'id',
      'total',
      'customer',
      'actions',
    ])
    expect(later).toBeDisabled()
    const earlier = screen.getByRole('button', { name: 'Move Customer earlier' })
    await waitFor(() => expect(earlier).toHaveFocus())

    await user.keyboard('{Enter}')
    expect(useTableViewStore.getState().views.orders?.columnOrder).toEqual([
      'id',
      'customer',
      'total',
      'actions',
    ])
    await waitFor(() => expect(later).toHaveFocus())
  })
})
