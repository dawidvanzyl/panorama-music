import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/base';
import { loginAsRoles } from '../../../fixtures/testUsers';
import {
  cancelModal,
  expectBold,
  expectCannotBeUndoneBold,
  expectDestructiveTemplate,
} from '../../../fixtures/destructiveModal';
import {
  closeAll,
  countRequestsWhere,
  isAdminSingleRevoke,
  seedTargetUser,
  sessionStatus,
} from '../../../fixtures/agentSessions';
import { AdminSessionsPage } from '../../../pages/identity/admin/AdminSessionsPage';

async function openFilteredSessions(page: Page, email: string): Promise<AdminSessionsPage> {
  const sessionsPage = new AdminSessionsPage(page);
  await sessionsPage.gotoAdminSessions();
  await expect(sessionsPage.heading).toBeVisible();
  await sessionsPage.filterInput.fill(email);
  return sessionsPage;
}

test.describe('Revoke Session modal on the admin sessions page — template', { tag: ['@266IT14'] }, () => {
  test('S1 the Revoke Session modal has the destructive template and names the device', async ({
    page,
    browser,
  }) => {
    const { email, sessions } = await seedTargetUser(page, browser, 'revoke-session-look', 1);
    const [session] = sessions;
    try {
      await loginAsRoles(page, ['Admin']);
      const deletesSent = countRequestsWhere(page, 'DELETE', isAdminSingleRevoke);
      const sessionsPage = await openFilteredSessions(page, email);
      await expect(sessionsPage.rowByEmail(email)).toHaveCount(1);

      await sessionsPage.revokeRow(sessionsPage.rowByEmail(email));

      const modal = sessionsPage.revokeSessionModal;
      await expectDestructiveTemplate(modal, {
        title: 'Revoke Session',
        body: `This action cannot be undone. The session on ${session.userAgent} will be ended. That device must sign in again.`,
        confirm: 'Revoke',
      });
      await expectCannotBeUndoneBold(modal);
      await expectBold(modal.locator('#modalDevice'), session.userAgent);
      expect(deletesSent()).toBe(0);
      expect(await sessionStatus(page, session.accessToken)).toBe(200);
    } finally {
      await closeAll(sessions);
    }
  });
});

test.describe('Revoke Session modal on the admin sessions page — confirm', { tag: ['@266IT15'] }, () => {
  test('S1 only the chosen session is revoked', async ({ page, browser }) => {
    const { email, sessions } = await seedTargetUser(page, browser, 'revoke-session-one', 2);
    const [a, b] = sessions;
    try {
      await loginAsRoles(page, ['Admin']);
      const deletesSent = countRequestsWhere(page, 'DELETE', isAdminSingleRevoke);
      const sessionsPage = await openFilteredSessions(page, email);
      await expect(sessionsPage.rowByEmail(email)).toHaveCount(2);

      await sessionsPage.revokeRow(sessionsPage.rowByEmail(email).filter({ hasText: a.userAgent }));
      await sessionsPage.confirmRevoke();

      await expect(sessionsPage.rowByEmail(email).filter({ hasText: a.userAgent })).toHaveCount(0);
      await expect(sessionsPage.rowByEmail(email).filter({ hasText: b.userAgent })).toHaveCount(1);
      expect(deletesSent()).toBe(1);
      expect(await sessionStatus(page, a.accessToken)).toBe(401);
      expect(await sessionStatus(page, b.accessToken)).toBe(200);
      await expect(page).not.toHaveURL(/login/);
      await expect(sessionsPage.heading).toBeVisible();
    } finally {
      await closeAll(sessions);
    }
  });

  test('S2 the revoke survives a reload', async ({ page, browser }) => {
    const { email, sessions } = await seedTargetUser(page, browser, 'revoke-session-reload', 2);
    const [a, b] = sessions;
    try {
      await loginAsRoles(page, ['Admin']);
      const sessionsPage = await openFilteredSessions(page, email);
      await expect(sessionsPage.rowByEmail(email)).toHaveCount(2);
      await sessionsPage.revokeRow(sessionsPage.rowByEmail(email).filter({ hasText: a.userAgent }));
      await sessionsPage.confirmRevoke();
      await expect(sessionsPage.rowByEmail(email)).toHaveCount(1);

      await page.reload();
      await expect(sessionsPage.heading).toBeVisible();
      await sessionsPage.filterInput.fill(email);

      await expect(sessionsPage.rowByEmail(email)).toHaveCount(1);
      await expect(sessionsPage.rowByEmail(email)).toContainText(b.userAgent);
    } finally {
      await closeAll(sessions);
    }
  });
});

test.describe('Revoke Session modal on the admin sessions page — cancel', { tag: ['@266IT16'] }, () => {
  test('S1 Cancel revokes nothing', async ({ page, browser }) => {
    const { email, sessions } = await seedTargetUser(page, browser, 'revoke-session-cancel', 1);
    const [session] = sessions;
    try {
      await loginAsRoles(page, ['Admin']);
      const deletesSent = countRequestsWhere(page, 'DELETE', isAdminSingleRevoke);
      const sessionsPage = await openFilteredSessions(page, email);
      await expect(sessionsPage.rowByEmail(email)).toHaveCount(1);
      await sessionsPage.revokeRow(sessionsPage.rowByEmail(email));
      await expect(sessionsPage.revokeSessionModal.locator('.modal__card')).toBeVisible();

      await cancelModal(sessionsPage.revokeSessionModal);

      await expect(sessionsPage.rowByEmail(email)).toHaveCount(1);
      expect(deletesSent()).toBe(0);
      expect(await sessionStatus(page, session.accessToken)).toBe(200);
    } finally {
      await closeAll(sessions);
    }
  });

  test('S2 the session is still listed after a reload', async ({ page, browser }) => {
    const { email, sessions } = await seedTargetUser(page, browser, 'revoke-session-cancel-reload', 1);
    const [session] = sessions;
    try {
      await loginAsRoles(page, ['Admin']);
      const sessionsPage = await openFilteredSessions(page, email);
      await expect(sessionsPage.rowByEmail(email)).toHaveCount(1);
      await sessionsPage.revokeRow(sessionsPage.rowByEmail(email));
      await expect(sessionsPage.revokeSessionModal.locator('.modal__card')).toBeVisible();
      await cancelModal(sessionsPage.revokeSessionModal);

      await page.reload();
      await expect(sessionsPage.heading).toBeVisible();
      await sessionsPage.filterInput.fill(email);

      await expect(sessionsPage.rowByEmail(email)).toHaveCount(1);
      await expect(sessionsPage.rowByEmail(email)).toContainText(session.userAgent);
    } finally {
      await closeAll(sessions);
    }
  });
});
