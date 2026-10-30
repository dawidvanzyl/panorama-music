import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/base';
import { createRegisteredUser, goToAdminUsersPage, uniqueTestEmail } from '../../../fixtures/testUsers';
import { cancelModal, expectBold, expectDestructiveTemplate } from '../../../fixtures/destructiveModal';
import type { AdminUsersPage } from '../../../pages/identity/admin/AdminUsersPage';

const PASSWORD = 'WordingPass123';

/** A deactivated user, since Delete is offered only for one. */
async function deactivatedUser(page: Page, label: string): Promise<{ email: string; adminUsersPage: AdminUsersPage }> {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, PASSWORD);
  const adminUsersPage = await goToAdminUsersPage(page);
  await adminUsersPage.deactivateUser(email);
  await expect(adminUsersPage.status(email)).toHaveText('Deactivated');
  return { email, adminUsersPage };
}

function confirmLabel(page: Page, email: string) {
  return page.locator('#deleteModal').getByLabel(`Type "${email}" to confirm`, { exact: true });
}

function deleteButton(page: Page) {
  return page.locator('#deleteModal').getByRole('button', { name: 'Delete', exact: true });
}

test.describe('Delete User modal — destructive wording', { tag: ['@266IT7'] }, () => {
  test('S1 the Delete User modal names the email and keeps the instruction out of the body', async ({ page }) => {
    const { email, adminUsersPage } = await deactivatedUser(page, 'wording-user');

    await adminUsersPage.row(email).locator('.users-table__btn--delete').click();

    const modal = page.locator('#deleteModal');
    await expectDestructiveTemplate(modal, {
      title: 'Delete User',
      body: `This action cannot be undone. The user ${email} will be permanently removed.`,
      confirm: 'Delete',
    });
    await expectBold(modal.locator('#modalEmail'), email);
    await expect(deleteButton(page)).toBeDisabled();

    await cancelModal(modal);
    await expect(adminUsersPage.row(email)).toBeVisible();
  });
});

test.describe('Delete User modal — typed email gate', { tag: ['@266IT51'] }, () => {
  test('S1 the field label carries the instruction', async ({ page }) => {
    const { email, adminUsersPage } = await deactivatedUser(page, 'wording-label');

    await adminUsersPage.row(email).locator('.users-table__btn--delete').click();

    const modal = page.locator('#deleteModal');
    await expect(confirmLabel(page, email)).toBeVisible();
    await expect(modal.locator('#confirmLabel')).toHaveText(`Type "${email}" to confirm`);
    await expect(modal.locator('.modal__body')).not.toContainText('Type');
    await expect(modal.locator('.modal__body')).not.toContainText('to confirm');
    await expect(deleteButton(page)).toBeDisabled();

    await cancelModal(modal);
  });

  test('S2 near misses keep Delete disabled', async ({ page }) => {
    const { email, adminUsersPage } = await deactivatedUser(page, 'wording-near');
    await adminUsersPage.row(email).locator('.users-table__btn--delete').click();
    const modal = page.locator('#deleteModal');
    const field = confirmLabel(page, email);

    const nearMisses = [
      email.slice(0, -1),
      email.toUpperCase(),
      ` ${email}`,
      `${email} `,
      uniqueTestEmail('wording-other'),
    ];
    for (const attempt of nearMisses) {
      await field.fill('');
      await field.fill(attempt);
      await expect(deleteButton(page)).toBeDisabled();
      await expect(modal.locator('#confirmLabel')).toHaveText(`Type "${email}" to confirm`);
    }

    await cancelModal(modal);
    await expect(adminUsersPage.row(email)).toBeVisible();
  });
});

test.describe('Delete User modal — exact email deletes', { tag: ['@266IT52'] }, () => {
  test('S1 the exact email enables Delete and the user is deleted', async ({ page }) => {
    const { email, adminUsersPage } = await deactivatedUser(page, 'wording-delete');
    await adminUsersPage.row(email).locator('.users-table__btn--delete').click();
    const field = confirmLabel(page, email);

    await field.fill(email.slice(0, -1));
    await expect(deleteButton(page)).toBeDisabled();

    await field.fill(email);
    await expect(deleteButton(page)).toBeEnabled();
    await deleteButton(page).click();

    await expect(page.locator('#deleteModal').locator('.modal__card')).toBeHidden();
    await expect(adminUsersPage.row(email)).toHaveCount(0);

    await page.reload();
    await expect(page.locator('.users-table__status').first()).toBeVisible();
    await expect(adminUsersPage.row(email)).toHaveCount(0);
  });
});
