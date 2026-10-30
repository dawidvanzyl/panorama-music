import { test, expect } from '../../../fixtures/base';
import { clickBackdropLeftThenAbove } from '../../../fixtures/modalFrame';
import {
  cancelModal,
  expectBold,
  expectCannotBeUndoneBold,
  expectDestructiveTemplate,
} from '../../../fixtures/destructiveModal';
import {
  closeAll,
  countRequestsWhere,
  expectOnTop,
  isOwnRevokeOthers,
  isOwnSingleRevoke,
  seedOwnSessionsUser,
  sessionStatus,
} from '../../../fixtures/agentSessions';
import { SessionsPage } from '../../../pages/identity/auth/SessionsPage';

const REVOKE_OTHERS_BODY =
  'This action cannot be undone. All other sessions of this account will be ended. Those devices must sign in again.';

test.describe('Own sessions — Revoke Session confirmation', { tag: ['@266IT17'] }, () => {
  test('S1 the row Revoke opens the confirmation above and waits for confirm', async ({
    page,
    browser,
  }) => {
    const { ownToken, others } = await seedOwnSessionsUser(page, browser, 'own-revoke-one', 1);
    const [other] = others;
    try {
      const singleRevokes = countRequestsWhere(page, 'DELETE', isOwnSingleRevoke);
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(2);

      await sessionsPage.revokeRow(sessionsPage.rowByDeviceLabel(other.userAgent));

      const confirmation = sessionsPage.revokeSessionModal;
      await expect(confirmation.locator('.modal__card')).toBeVisible();
      await expect(confirmation.getByRole('heading', { level: 2 })).toHaveText('Revoke Session');
      await expectBold(confirmation.locator('#modalDevice'), other.userAgent);
      await expectOnTop(page, confirmation, confirmation.locator('.modal__card'));
      await expect(sessionsPage.card).toBeVisible();
      expect(singleRevokes()).toBe(0);
      expect(await sessionStatus(page, other.accessToken)).toBe(200);

      await sessionsPage.confirmRevoke();

      await expect(sessionsPage.card).toBeVisible();
      await expect(sessionsPage.rows).toHaveCount(1);
      expect(singleRevokes()).toBe(1);
      expect(await sessionStatus(page, other.accessToken)).toBe(401);
      expect(await sessionStatus(page, ownToken)).toBe(200);
    } finally {
      await closeAll(others);
    }
  });

  test('S2 the current session row offers no Revoke', async ({ page, browser }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-revoke-current', 1);
    try {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(2);

      await expect(sessionsPage.currentRow()).toHaveCount(1);
      await expect(sessionsPage.currentRow().getByRole('button', { name: 'Revoke' })).toHaveCount(0);
      await expect(
        sessionsPage.rows.filter({ hasNotText: 'Current Session' }).getByRole('button', { name: 'Revoke' }),
      ).toHaveCount(1);
    } finally {
      await closeAll(others);
    }
  });
});

test.describe('Own sessions — form modal without icon or footer', { tag: ['@266IT33'] }, () => {
  test('S1 no icon, no footer, Revoke All Others above the table', async ({ page, browser }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-form-modal', 1);
    try {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(2);

      await expect(sessionsPage.modal.getByRole('heading', { level: 2 })).toHaveText('Active Sessions');
      await expect(sessionsPage.modal.locator('.modal__header .modal__icon')).toHaveCount(0);
      await expect(
        sessionsPage.modal.locator('.modal__actions, [data-testid="modal-actions"]'),
      ).toHaveCount(0);

      const button = sessionsPage.modal.getByRole('button', { name: 'Revoke All Others', exact: true });
      await expect(button).toBeVisible();
      await expect(
        sessionsPage.modal.getByRole('button', { name: 'Revoke all other sessions' }),
      ).toHaveCount(0);
      await expect(sessionsPage.modal.locator('table').getByRole('button', { name: 'Revoke All Others' })).toHaveCount(0);

      const buttonBox = await button.boundingBox();
      const tableBox = await sessionsPage.table.boundingBox();
      expect(buttonBox, 'the button has a box').not.toBeNull();
      expect(tableBox, 'the sessions table has a box').not.toBeNull();
      expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(tableBox!.y + 0.5);
      expect(Math.abs(buttonBox!.x + buttonBox!.width - (tableBox!.x + tableBox!.width))).toBeLessThanOrEqual(1);
    } finally {
      await closeAll(others);
    }
  });
});

test.describe('Own sessions — Revoke Other Sessions close control', { tag: ['@266IT40'] }, () => {
  test('S1 the close control closes only the confirmation and revokes nothing', async ({
    page,
    browser,
  }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-others-close', 2);
    try {
      const revokesSent = countRequestsWhere(page, 'DELETE', isOwnRevokeOthers);
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(3);
      await sessionsPage.revokeAllBtn.click();
      const confirmation = sessionsPage.revokeOtherSessionsModal;
      await expect(confirmation.locator('.modal__card')).toBeVisible();

      await confirmation.getByRole('button', { name: 'Close', exact: true }).click();

      await expect(confirmation.locator('.modal__card')).toBeHidden();
      await expect(sessionsPage.card).toBeVisible();
      await expect(sessionsPage.rows).toHaveCount(3);
      for (const other of others) {
        await expect(sessionsPage.rowByDeviceLabel(other.userAgent)).toHaveCount(1);
        expect(await sessionStatus(page, other.accessToken)).toBe(200);
      }
      expect(revokesSent()).toBe(0);
    } finally {
      await closeAll(others);
    }
  });
});

test.describe('Own sessions — Revoke Other Sessions ignores the backdrop and keys', { tag: ['@266IT45'] }, () => {
  test('S1 backdrop clicks and Escape leave both modals open', async ({ page, browser }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-others-backdrop', 1);
    try {
      const revokesSent = countRequestsWhere(page, 'DELETE', isOwnRevokeOthers);
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(2);
      await sessionsPage.revokeAllBtn.click();
      const confirmationCard = sessionsPage.revokeOtherSessionsModal.locator('.modal__card');
      await expect(confirmationCard).toBeVisible();

      const expectBothOpen = async (): Promise<void> => {
        await expect(confirmationCard).toBeVisible();
        await expect(sessionsPage.card).toBeVisible();
      };
      await clickBackdropLeftThenAbove(page, confirmationCard, expectBothOpen);
      await page.keyboard.press('Escape');
      await expectBothOpen();

      expect(revokesSent()).toBe(0);
      expect(await sessionStatus(page, others[0].accessToken)).toBe(200);
    } finally {
      await closeAll(others);
    }
  });
});

test.describe('Own sessions — Revoke Other Sessions template', { tag: ['@266IT48'] }, () => {
  test('S1 the confirmation opens above with the destructive template and nothing is revoked', async ({
    page,
    browser,
  }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-others-look', 2);
    try {
      const revokesSent = countRequestsWhere(page, 'DELETE', isOwnRevokeOthers);
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(3);

      await sessionsPage.revokeAllBtn.click();

      const confirmation = sessionsPage.revokeOtherSessionsModal;
      await expectDestructiveTemplate(confirmation, {
        title: 'Revoke Other Sessions',
        body: REVOKE_OTHERS_BODY,
        confirm: 'Revoke All Others',
      });
      await expectCannotBeUndoneBold(confirmation);
      await expectOnTop(page, confirmation, confirmation.locator('.modal__card'));
      expect(revokesSent()).toBe(0);
      for (const other of others) {
        expect(await sessionStatus(page, other.accessToken)).toBe(200);
      }
      await expect(sessionsPage.rows).toHaveCount(3);
    } finally {
      await closeAll(others);
    }
  });
});

test.describe('Own sessions — Revoke Other Sessions confirm', { tag: ['@266IT49'] }, () => {
  test('S1 confirming revokes both others and keeps the current session', async ({
    page,
    browser,
  }) => {
    const { ownToken, others } = await seedOwnSessionsUser(page, browser, 'own-others-confirm', 2);
    try {
      const revokesSent = countRequestsWhere(page, 'DELETE', isOwnRevokeOthers);
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(3);
      await sessionsPage.revokeAllBtn.click();
      const confirmation = sessionsPage.revokeOtherSessionsModal;
      await expect(confirmation.locator('.modal__card')).toBeVisible();

      await confirmation.getByRole('button', { name: 'Revoke All Others', exact: true }).click();

      await expect(confirmation.locator('.modal__card')).toBeHidden();
      await expect(sessionsPage.rows).toHaveCount(1);
      await expect(sessionsPage.currentRow()).toHaveCount(1);
      expect(revokesSent()).toBe(1);
      for (const other of others) {
        expect(await sessionStatus(page, other.accessToken)).toBe(401);
      }
      expect(await sessionStatus(page, ownToken)).toBe(200);
    } finally {
      await closeAll(others);
    }
  });

  test('S2 the current session is still signed in after a reload', async ({ page, browser }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-others-reload', 2);
    try {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(3);
      await sessionsPage.revokeAllBtn.click();
      const confirmation = sessionsPage.revokeOtherSessionsModal;
      await confirmation.getByRole('button', { name: 'Revoke All Others', exact: true }).click();
      await expect(confirmation.locator('.modal__card')).toBeHidden();
      await expect(sessionsPage.rows).toHaveCount(1);

      await page.reload();

      await expect(page).not.toHaveURL(/login/);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(1);
      await expect(sessionsPage.currentRow()).toHaveCount(1);
    } finally {
      await closeAll(others);
    }
  });
});

test.describe('Own sessions — Revoke Other Sessions cancel', { tag: ['@266IT50'] }, () => {
  test('S1 Cancel revokes nothing', async ({ page, browser }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-others-cancel', 2);
    try {
      const revokesSent = countRequestsWhere(page, 'DELETE', isOwnRevokeOthers);
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(3);
      await sessionsPage.revokeAllBtn.click();
      await expect(sessionsPage.revokeOtherSessionsModal.locator('.modal__card')).toBeVisible();

      await cancelModal(sessionsPage.revokeOtherSessionsModal);

      await expect(sessionsPage.card).toBeVisible();
      await expect(sessionsPage.rows).toHaveCount(3);
      for (const other of others) {
        await expect(sessionsPage.rowByDeviceLabel(other.userAgent)).toHaveCount(1);
        expect(await sessionStatus(page, other.accessToken)).toBe(200);
      }
      expect(revokesSent()).toBe(0);
    } finally {
      await closeAll(others);
    }
  });

  test('S2 the sessions are still listed after reopening', async ({ page, browser }) => {
    const { others } = await seedOwnSessionsUser(page, browser, 'own-others-cancel-reopen', 2);
    try {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();
      await expect(sessionsPage.rows).toHaveCount(3);
      await sessionsPage.revokeAllBtn.click();
      await expect(sessionsPage.revokeOtherSessionsModal.locator('.modal__card')).toBeVisible();
      await cancelModal(sessionsPage.revokeOtherSessionsModal);

      await sessionsPage.close();
      await sessionsPage.openSessions();

      await expect(sessionsPage.rows).toHaveCount(3);
      for (const other of others) {
        await expect(sessionsPage.rowByDeviceLabel(other.userAgent)).toHaveCount(1);
      }
    } finally {
      await closeAll(others);
    }
  });
});
