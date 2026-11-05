import { expect, test, type Page } from './fixtures.js'

async function choosePage(page: Page, name: string) {
  // Wait for the actual shell control instead of sending a shortcut before app startup.
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  const palette = page.getByRole('dialog', { name: 'Search workspace', exact: true })
  await palette.getByRole('combobox', { name: 'Search workspace', exact: true }).fill(name)
  await page.keyboard.press('Enter')
  await expect(palette).toBeHidden()
}

function discardPrompt(page: Page) {
  return page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
}

test('keeps settings drafts when navigation is cancelled and discards only on confirmation', async ({
  page,
}) => {
  await page.goto('/settings')
  const name = page.getByRole('textbox', { name: 'Workspace name', exact: true })
  await name.fill('Unfinished workspace')
  await choosePage(page, 'Projects')
  const prompt = discardPrompt(page)
  await expect(prompt).toBeVisible()
  await expect(prompt.getByRole('button', { name: 'Keep editing', exact: true })).toBeFocused()
  await expect(page).toHaveURL('/settings')
  await prompt.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(prompt).toBeHidden()
  await expect(name).toHaveValue('Unfinished workspace')
  await expect(name).toBeFocused()

  await choosePage(page, 'Projects')
  await prompt.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page).toHaveURL('/projects')
  await choosePage(page, 'Settings')
  await expect(name).toHaveValue('Acme Studio')

  await name.fill('  Saved workspace  ')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(name).toHaveValue('Saved workspace')
  await choosePage(page, 'Projects')
  await expect(page).toHaveURL('/projects')
  await expect(prompt).toHaveCount(0)
})

test('protects settings against browser history and reload without trapping a saved form', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Native unload and history are checked once.')
  await page.goto('/projects')
  await choosePage(page, 'Settings')
  const name = page.getByRole('textbox', { name: 'Workspace name', exact: true })
  const prompt = discardPrompt(page)
  await name.fill('History draft')

  // Do not await page.goBack: the app must resolve the blocked navigation first.
  await page.evaluate(() => window.history.back())
  await expect(prompt).toBeVisible()
  await prompt.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(prompt).toBeHidden()
  await expect(page).toHaveURL('/settings')
  await expect(name).toHaveValue('History draft')
  await page.evaluate(() => window.history.back())
  await prompt.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page).toHaveURL('/projects')
  await page.goForward()
  await expect(page).toHaveURL('/settings')
  await expect(name).toHaveValue('Acme Studio')

  await name.fill('Reload draft')
  const nativeDialog = page.waitForEvent('dialog')
  const reload = page.reload().then(
    () => 'reloaded',
    () => 'cancelled',
  )
  const confirmation = await nativeDialog
  expect(confirmation.type()).toBe('beforeunload')
  await confirmation.dismiss()
  expect(await reload).toBe('cancelled')
  await expect(name).toHaveValue('Reload draft')

  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  const unexpectedDialogs: string[] = []
  page.on('dialog', async (dialog) => {
    unexpectedDialogs.push(dialog.type())
    await dialog.dismiss()
  })
  await page.reload()
  await expect(name).toHaveValue('Reload draft')
  expect(unexpectedDialogs).toEqual([])
})

test('protects project drafts for Escape, cancel, outside click and close while retaining focus', async ({
  page,
}) => {
  await page.goto('/projects')
  const trigger = page.getByRole('button', { name: 'New project', exact: true })
  const editor = page.getByRole('dialog', { name: 'Create a project', exact: true })
  const prompt = discardPrompt(page)

  await trigger.click()
  await editor.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(prompt).toHaveCount(0)
  await trigger.click()
  const name = editor.getByRole('textbox', { name: 'Project name', exact: true })
  await name.fill('Project draft')
  await page.keyboard.press('Escape')
  await expect(prompt).toBeVisible()
  await expect(prompt.getByRole('button', { name: 'Keep editing', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(prompt).toBeHidden()
  await expect(editor).toBeVisible()
  await expect(name).toHaveValue('Project draft')
  await expect(name).toBeFocused()

  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  await prompt.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(prompt).toBeHidden()
  await expect(editor).toBeVisible()
  await expect(name).toHaveValue('Project draft')
  await expect(name).toBeFocused()

  await page.mouse.click(4, 4)
  await expect(prompt).toBeVisible()
  await prompt.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(prompt).toBeHidden()
  await expect(name).toHaveValue('Project draft')
  await expect(name).toBeFocused()

  await editor.getByRole('button', { name: 'Close', exact: true }).click()
  await prompt.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(name).toHaveValue('')
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(prompt).toHaveCount(0)
})
