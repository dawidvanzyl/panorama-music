import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/base';
import { createRegisteredUser, goToAdminUsersPage, uniqueTestEmail } from '../../../fixtures/testUsers';
import { actionNames } from '../../../fixtures/rowActions';
import type { AdminUsersPage } from '../../../pages/identity/admin/AdminUsersPage';

const PASSWORD = 'RowActionsPass123';

/** A registered user who has been deactivated through the page, listed after a reload. */
async function deactivatedUser(page: Page, label: string): Promise<{ usersPage: AdminUsersPage; email: string }> {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, PASSWORD);
  const usersPage = await goToAdminUsersPage(page);
  await usersPage.deactivateUser(email);
  await expect(usersPage.status(email)).toHaveText('Deactivated');
  await page.reload();
  await expect(usersPage.status(email)).toHaveText('Deactivated');
  return { usersPage, email };
}

test.describe('Users — row action verbs', { tag: ['@267IT15'] }, () => {
  test('S1 a deactivated user offers Reactivate then Delete', async ({ page }) => {
    const { usersPage, email } = await deactivatedUser(page, 'row-actions-reactivate');

    const row = usersPage.row(email);
    expect(await actionNames(row)).toEqual(['Reactivate', 'Delete']);
    await expect(row.getByRole('button', { name: 'Activate', exact: true })).toHaveCount(0);
  });

  test('S2 Reactivate still reactivates', async ({ page }) => {
    const { usersPage, email } = await deactivatedUser(page, 'row-actions-persist');

    await usersPage.activateUser(email);
    await page.reload();

    await expect(usersPage.status(email)).toHaveText('Active');
    expect(await actionNames(usersPage.row(email))).toEqual(['Edit', 'Deactivate']);
  });
});
