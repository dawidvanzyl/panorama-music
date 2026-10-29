import { test, expect } from '../../../fixtures/base';
import { loginAsRoles } from '../../../fixtures/testUsers';
import { countRequests } from '../../../fixtures/modalFrame';
import { signInOtherUser } from '../../../fixtures/otherUserSession';
import {
  cancelModal,
  expectCannotBeUndoneBold,
  expectDestructiveTemplate,
} from '../../../fixtures/destructiveModal';
import { AdminSessionsPage } from '../../../pages/identity/admin/AdminSessionsPage';

const REVOKE_ALL_PATH = '/api/auth/admin/sessions/all';

test.describe('Revoke All Sessions modal — destructive look', { tag: ['@266IT13'] }, () => {
  test('S1 the Revoke All Sessions modal has the destructive look', async ({ page, browser }) => {
    const other = await signInOtherUser(page, browser, 'revoke-look', 'RevokeLook123');
    await loginAsRoles(page, ['Admin']);
    const deletesSent = countRequests(page, 'DELETE', REVOKE_ALL_PATH);
    const sessionsPage = new AdminSessionsPage(page);
    await sessionsPage.gotoAdminSessions();
    await expect(sessionsPage.heading).toBeVisible();
    await sessionsPage.filterInput.fill(other.email);
    await expect(sessionsPage.rowByEmail(other.email)).toHaveCount(1);

    await sessionsPage.revokeAllBtn.click();

    const modal = page.locator('#revokeAllModal');
    await expectDestructiveTemplate(modal, {
      title: 'Revoke All Sessions',
      body: 'This action cannot be undone. Every other session of every user will be ended. Those users must sign in again.',
      confirm: 'Revoke All',
    });
    await expectCannotBeUndoneBold(modal);
    await expect(sessionsPage.revokeAllModalConfirmButton).toBeDisabled();

    await cancelModal(modal);
    expect(deletesSent()).toBe(0);
    await expect(sessionsPage.rowByEmail(other.email)).toHaveCount(1);

    await other.context.close();
  });
});
