import { test, expect } from '../../../fixtures/base';
import { createRegisteredUser, goToAdminUsersPage, uniqueTestEmail } from '../../../fixtures/testUsers';
import { cancelModal, expectBold, visibleBody } from '../../../fixtures/destructiveModal';
import { expectReversibleTemplate } from '../../../fixtures/reversibleModal';

const PASSWORD = 'ReversibleUser123!';
const DEACTIVATE_PATH = /^\/api\/users\/[^/]+\/deactivate$/;

test.describe('Deactivate User modal — reversible look', { tag: ['@266IT25'] }, () => {
  test('S1 the Deactivate User modal has the reversible look and wording', async ({ page }) => {
    const email = uniqueTestEmail('rev-user');
    await createRegisteredUser(page, email, PASSWORD);
    const usersPage = await goToAdminUsersPage(page);
    await expect(usersPage.status(email)).toHaveText('Active');
    let deactivatesSent = 0;
    page.on('request', (request) => {
      if (request.method() === 'PATCH' && DEACTIVATE_PATH.test(new URL(request.url()).pathname)) {
        deactivatesSent += 1;
      }
    });

    await usersPage.row(email).locator('.users-table__btn--deactivate').click();

    const modal = page.locator('#deactivateModal');
    await expectReversibleTemplate(modal, {
      title: 'Deactivate User',
      body: `The user ${email} will be deactivated. They can no longer sign in. You can reactivate this user later.`,
      confirm: 'Deactivate',
    });
    await expectBold(visibleBody(modal).locator('strong'), email);

    await cancelModal(modal);
    expect(deactivatesSent).toBe(0);
    await expect(usersPage.status(email)).toHaveText('Active');
  });

  test('S2 the primary Deactivate still deactivates, and the user can be reactivated', async ({ page }) => {
    const email = uniqueTestEmail('rev-user-undo');
    await createRegisteredUser(page, email, PASSWORD);
    const usersPage = await goToAdminUsersPage(page);
    await expect(usersPage.status(email)).toHaveText('Active');

    await usersPage.row(email).locator('.users-table__btn--deactivate').click();
    const modal = page.locator('#deactivateModal');
    await modal.getByRole('button', { name: 'Deactivate', exact: true }).click();

    await expect(modal.locator('.modal__card')).toBeHidden();
    await expect(usersPage.status(email)).toHaveText('Deactivated');

    await page.reload();
    await expect(usersPage.status(email)).toHaveText('Deactivated');

    await usersPage.activateUser(email);
    await expect(usersPage.status(email)).toHaveText('Active');
  });
});
