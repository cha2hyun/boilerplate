import { expect, test, type Page } from './fixtures.js'

async function signIn(page: Page) {
  await page.getByRole('button', { name: 'Fill demo credentials', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('restores a protected account in this tab and requires sign-in after logout', async ({
  page,
  context,
}) => {
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0)
  await page.getByLabel('Email', { exact: true }).fill('someone@example.com')
  await page.getByLabel('Password', { exact: true }).fill('invalid-demo-value')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await signIn(page)
  await expect(page).toHaveURL('/account')
  await expect(page.getByText('admin@example.com', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Alex Morgan', { exact: true })).toBeVisible()
  const another = await context.newPage()
  await another.goto('/account')
  await expect(another.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await another.close()
  await page.getByRole('link', { name: 'View workspace users' }).click()
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
})

test('restores a user deep link and keeps demo invitations and access changes on reload', async ({
  page,
}) => {
  await page.goto('/users?q=Alex&id=usr_demo')
  await signIn(page)
  await expect(page).toHaveURL(/\/users\?/)
  const self = page.getByRole('dialog', { name: 'Alex Morgan' })
  await expect(self).toBeVisible()
  await expect(self.getByRole('button', { name: 'Edit access' })).toHaveCount(0)
  await self.press('Escape')
  const search = page.getByRole('searchbox', { name: 'Search users' })
  await expect(search).toHaveValue('Alex')
  await search.fill('')
  await page.getByRole('button', { name: 'Invite user', exact: true }).click()
  const invite = page.getByRole('dialog', { name: 'Invite user' })
  await invite.getByLabel('Name', { exact: true }).fill('Casey Sample')
  await invite.getByLabel('Email', { exact: true }).fill('casey@example.com')
  await invite.getByRole('button', { name: 'Create invitation' }).click()
  await expect(invite).toBeHidden()
  const details = page.getByRole('dialog', { name: 'Casey Sample', exact: true })
  await expect(details.getByText('Invited', { exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Edit access' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit access', exact: true })
  await edit.getByRole('combobox', { name: 'Role' }).click()
  await page.getByRole('option', { name: 'Viewer', exact: true }).click()
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(edit).toBeHidden()
  await page.reload()
  await expect(details.getByText('Viewer', { exact: true })).toBeVisible()
  await expect(details.getByText('casey@example.com', { exact: true })).toBeVisible()
})

test('keeps the signed-in session when a draft blocks sign-out', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'One browser covers the route and draft handshake.',
  )
  await page.goto('/login')
  await signIn(page)
  await expect(page).toHaveURL('/account')
  await page.goto('/settings')
  const name = page.getByRole('textbox', { name: 'Workspace name', exact: true })
  await name.fill('Unsaved workspace')
  const signOut = async () => {
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
  }
  await signOut()
  const prompt = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
  await prompt.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible()
  await expect(name).toHaveValue('Unsaved workspace')
  await signOut()
  await prompt.getByRole('button', { name: 'Discard changes' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  await page.goto('/account')
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
})
