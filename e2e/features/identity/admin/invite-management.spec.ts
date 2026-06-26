import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, inviteUser, goToAdminUsersPage } from '../../../fixtures/testUsers';
import { extractTokenFromUrl } from '../../../fixtures/url';
import { RegistrationPage } from '../../../pages/identity/auth/RegistrationPage';

const NEW_PASSWORD = 'NewInvitePass123';

test.describe('Admin Invite Management Flow', { tag: '@M1.2IT5' }, () => {
  test('regenerates an invite, invalidating the old token and issuing a working new one', async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-reinvite');
    const oldToken = await inviteUser(page, email);

    const adminUsersPage = await goToAdminUsersPage(page);
    const newInviteUrl = await adminUsersPage.regenerateInvite(email);
    const newToken = extractTokenFromUrl(newInviteUrl);

    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);

    const registrationPage = new RegistrationPage(page);

    await registrationPage.gotoRegister(oldToken);
    await registrationPage.register(NEW_PASSWORD, NEW_PASSWORD);
    await expect(registrationPage.errorBanner).toBeVisible();
    await expect(registrationPage.errorText).toHaveText('Invite link is invalid or expired');

    await registrationPage.gotoRegister(newToken);
    await registrationPage.register(NEW_PASSWORD, NEW_PASSWORD);
    await expect(page).toHaveURL(/#\/login\?registered=true$/);
  });
});
