import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/base';
import { loginAsRoles } from '../../../fixtures/testUsers';
import { countRequests } from '../../../fixtures/modalFrame';
import { visibleBody } from '../../../fixtures/destructiveModal';
import { AdminSessionsPage } from '../../../pages/identity/admin/AdminSessionsPage';

const REVOKE_ALL_PATH = '/api/auth/admin/sessions/all';

test.describe('Revoke All Sessions modal — typed-confirmation gate', { tag: ['@266IT53'] }, () => {
  async function openRevokeAll(page: Page) {
    await loginAsRoles(page, ['Admin']);
    const deletesSent = countRequests(page, 'DELETE', REVOKE_ALL_PATH);
    const sessionsPage = new AdminSessionsPage(page);
    await sessionsPage.gotoAdminSessions();
    await expect(sessionsPage.heading).toBeVisible();
    await sessionsPage.revokeAllBtn.click();
    const modal = page.locator('#revokeAllModal');
    await expect(modal.locator('.modal__card')).toBeVisible();
    return { modal, sessionsPage, deletesSent };
  }

  test('S1 near-miss text keeps Revoke All disabled', async ({ page }) => {
    const { modal, sessionsPage, deletesSent } = await openRevokeAll(page);
    const confirm = sessionsPage.revokeAllModalConfirmButton;
    const field = sessionsPage.revokeAllModalConfirmInput;

    await expect(confirm).toBeDisabled();
    await expect(modal.locator('#confirmLabel')).toHaveText('Type "REVOKE ALL" to confirm');
    await expect(modal.getByLabel('Type "REVOKE ALL" to confirm')).toHaveAttribute('id', 'confirmInput');
    const body = visibleBody(modal);
    await expect(body).not.toContainText('Type');
    await expect(body).not.toContainText('to confirm');
    await expect(body).not.toContainText('REVOKE ALL');

    for (const nearMiss of ['REVOKE', 'revoke all', 'Revoke All', ' REVOKE ALL', 'REVOKE ALL ', 'REVOKE  ALL']) {
      await field.fill(nearMiss);
      await expect(field).toHaveValue(nearMiss);
      await expect(confirm).toBeDisabled();
    }

    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal.locator('.modal__card')).toBeHidden();
    expect(deletesSent()).toBe(0);
  });

  test('S2 changing an exact match disables Revoke All again', async ({ page }) => {
    const { modal, sessionsPage, deletesSent } = await openRevokeAll(page);
    const confirm = sessionsPage.revokeAllModalConfirmButton;
    const field = sessionsPage.revokeAllModalConfirmInput;

    await field.fill('REVOKE ALL');
    await expect(confirm).toBeEnabled();
    await field.fill('REVOKE AL');
    await expect(confirm).toBeDisabled();

    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal.locator('.modal__card')).toBeHidden();
    expect(deletesSent()).toBe(0);
  });
});
