import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from './fixtures.js'

async function createProject(page: Page, name: string, description = '') {
  await page.getByRole('button', { name: 'New project', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create a project' })
  await dialog.getByLabel('Project name', { exact: true }).fill(name)
  if (description) await dialog.getByLabel('Description').fill(description)
  await dialog.getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: name.trim(), exact: true })).toBeVisible()
}

test('validates, creates, edits and deletes a project with persistence across reloads', async ({
  page,
}) => {
  await page.goto('/projects')
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New project', exact: true }).click()

  const createDialog = page.getByRole('dialog', { name: 'Create a project' })
  await createDialog.getByLabel('Project name', { exact: true }).fill('x')
  await createDialog.getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(createDialog.getByRole('alert')).toHaveText('Use at least 2 characters.')
  await expect(createDialog.getByLabel('Project name', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )

  await createDialog.getByLabel('Project name', { exact: true }).fill('  Launch planning  ')
  await createDialog.getByLabel('Description').fill('Align the team around our next launch.')
  await createDialog.getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(createDialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'New project', exact: true })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Launch planning', exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Launch planning', exact: true }).click()
  const editDialog = page.getByRole('dialog', { name: 'Edit project' })
  await expect(editDialog.getByLabel('Description')).toHaveValue(
    'Align the team around our next launch.',
  )
  await editDialog.getByLabel('Project name', { exact: true }).fill('Launch planning updated')
  await editDialog.getByLabel('Status', { exact: true }).click()
  await page.getByRole('option', { name: 'Paused', exact: true }).click()
  await editDialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(editDialog).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Launch planning updated', exact: true }),
  ).toBeFocused()
  await expect(page.getByRole('row').filter({ hasText: 'Launch planning updated' })).toContainText(
    'Paused',
  )

  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'Launch planning updated' })).toContainText(
    'Paused',
  )
  await page
    .getByRole('button', { name: 'Actions for Launch planning updated', exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Delete project', exact: true }).click()
  const deleteDialog = page.getByRole('alertdialog', { name: 'Delete this project?' })
  await deleteDialog.getByRole('button', { name: 'Keep project' }).click()
  await expect(
    page.getByRole('button', { name: 'Actions for Launch planning updated', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Launch planning updated', exact: true }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Actions for Launch planning updated', exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Delete project', exact: true }).click()
  await deleteDialog.getByRole('button', { name: 'Delete project', exact: true }).click()
  await expect(deleteDialog).toBeHidden()
  await expect(page.getByLabel('All projects', { exact: true })).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Launch planning updated', exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Website redesign', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Launch planning updated', exact: true }),
  ).toHaveCount(0)
})

test('searches owners and projects, filters status, resets empty results, and changes visible columns', async ({
  page,
}) => {
  await page.goto('/projects')
  const search = page.getByRole('textbox', { name: 'Search projects' })
  await search.fill('Phoenix')
  await expect(page.getByRole('button', { name: 'Mobile app launch', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Website redesign', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'Phoenix')
  await page.reload()
  await expect(search).toHaveValue('Phoenix')
  await expect(page.getByRole('button', { name: 'Mobile app launch', exact: true })).toBeVisible()

  await search.fill('No matching project exists')
  await expect(page.getByText('No matching projects', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(search).toBeFocused()
  await expect(page).toHaveURL('/projects')
  await page.getByRole('combobox', { name: 'Filter by status' }).click()
  await page.getByRole('option', { name: 'Paused', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Customer insights', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mobile app launch', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL((url) => url.searchParams.get('status') === 'paused')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toContainText('Paused')
  await page.goBack()
  await expect(page).toHaveURL('/projects')
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toContainText(
    'All statuses',
  )
  await page.goForward()
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toContainText('Paused')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(search).toBeFocused()

  await page.getByRole('button', { name: 'View', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Owner', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('columnheader', { name: 'Owner', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'View', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Owner', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('columnheader', { name: 'Owner', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('columnheader', { name: 'Progress', exact: true })).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('columnheader', { name: 'Progress', exact: true })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('sort') === 'progress' && !url.searchParams.has('order'),
  )
  await page.reload()
  await expect(page.getByRole('columnheader', { name: 'Progress', exact: true })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  await page.goBack()
  await expect(page.getByRole('columnheader', { name: 'Progress', exact: true })).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  await page.goForward()
  await expect(page.getByRole('columnheader', { name: 'Progress', exact: true })).toHaveAttribute(
    'aria-sort',
    'descending',
  )

  await page.goto(
    '/projects?q=%5B%22bad%22%5D&status=invalid&sort=owner&order=invalid&page=-2&pageSize=10',
  )
  await expect(search).toHaveValue('')
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toContainText(
    'All statuses',
  )
  await expect(
    page.getByRole('columnheader', { name: 'Last updated', exact: true }),
  ).toHaveAttribute('aria-sort', 'descending')
  await expect(page.getByRole('button', { name: 'Website redesign', exact: true })).toBeVisible()
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
})

test('keeps project validation and save controls reachable in a short viewport', async ({
  page,
  viewport,
}) => {
  await page.setViewportSize({ width: viewport?.width ?? 1440, height: 360 })
  await page.goto('/projects')
  await page.getByRole('button', { name: 'New project', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create a project', exact: true })
  const name = dialog.getByRole('textbox', { name: 'Project name', exact: true })
  const create = dialog.getByRole('button', { name: 'Create project', exact: true })

  await expect(dialog).toBeInViewport({ ratio: 1 })
  await name.fill('x')
  await create.click()
  await expect(dialog.getByRole('alert')).toHaveText('Use at least 2 characters.')
  await expect(dialog).toBeInViewport({ ratio: 1 })
  await name.fill('Short viewport project')
  await create.scrollIntoViewIfNeeded()
  await expect(create).toBeInViewport({ ratio: 1 })
  await create.click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'New project', exact: true })).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Short viewport project', exact: true }),
  ).toBeVisible()
})

test('paginates projects and exports only selected rows as a safe CSV', async ({ page }) => {
  await page.goto('/projects')
  await createProject(page, 'Export planning', 'A description with a comma, and "quotes".')
  await createProject(page, 'Second export project')
  await createProject(page, '=SUM(1,2)')

  await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')
  await page.reload()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Previous page', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Select Export planning', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Select =SUM(1,2)', exact: true }).check()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export 2 selected', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^blueprint-projects-\d{4}-\d{2}-\d{2}\.csv$/)
  const filePath = await download.path()
  if (!filePath) throw new Error('The CSV download did not produce a file.')
  const csv = await readFile(filePath, 'utf8')
  expect(csv).toContain('"Export planning"')
  expect(csv).toContain('"A description with a comma, and ""quotes""."')
  expect(csv).toContain('"\'=SUM(1,2)"')
  expect(csv).not.toContain('Second export project')
  expect(csv).not.toContain('Website redesign')

  if ((page.viewportSize()?.width ?? 1440) >= 768) {
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await page.getByRole('combobox', { name: 'Rows per page', exact: true }).click()
    await page.getByRole('option', { name: '16', exact: true }).click()
    await expect(page).toHaveURL(
      (url) => url.searchParams.get('pageSize') === '16' && !url.searchParams.has('page'),
    )
    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Rows per page', exact: true })).toHaveText(
      '16',
    )
    await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
  }
  await page.goto('/projects?page=999')
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')
})

test('keeps an edit open and explains the error when another tab deletes the project', async ({
  page,
  context,
}) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: 'Website redesign', exact: true }).click()
  const editDialog = page.getByRole('dialog', { name: 'Edit project' })
  await editDialog.getByLabel('Project name', { exact: true }).fill('A stale edit')

  const otherTab = await context.newPage()
  await otherTab.goto('/projects')
  await otherTab.getByRole('button', { name: 'Actions for Website redesign', exact: true }).click()
  await otherTab.getByRole('menuitem', { name: 'Delete project', exact: true }).click()
  const deleteDialog = otherTab.getByRole('alertdialog', { name: 'Delete this project?' })
  await deleteDialog.getByRole('button', { name: 'Delete project', exact: true }).click()
  await expect(deleteDialog).toBeHidden()

  await page.bringToFront()
  await editDialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(editDialog.getByRole('alert')).toHaveText(
    'This project could not be found. Refresh and try again.',
  )
  await expect(editDialog.getByLabel('Project name', { exact: true })).toHaveValue('A stale edit')
  await expect(editDialog.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled()
  await editDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(editDialog).toBeHidden()
  await otherTab.close()
})
