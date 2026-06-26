import { test, expect } from '../../../fixtures/base';
import { expireInviteToken } from '../../../fixtures/db';
import { uniqueTestEmail, inviteUser } from '../../../fixtures/testUsers';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../../pages/identity/auth/DashboardPage';
import { RegistrationPage } from '../../../pages/identity/auth/RegistrationPage';

const TEST_PASSWORD = 'TestPass123';

test.describe('Registration Flow', { tag: '@M1.2IT2' }, () => {
  test('completes registration via a valid invite link and activates the account', async ({ page }) => {
    const email = uniqueTestEmail('registration-valid');
    const token = await inviteUser(page, email);

    const registrationPage = new RegistrationPage(page);
    await registrationPage.gotoRegister(token);
    await registrationPage.register(TEST_PASSWORD, TEST_PASSWORD);

    await expect(registrationPage.successBanner).toBeVisible();
    await expect(page).toHaveURL(/#\/login\?registered=true$/);

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.login(email, TEST_PASSWORD);

    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('rejects an expired invite token and does not create or activate the account', async ({ page }) => {
    const email = uniqueTestEmail('registration-expired');
    const token = await inviteUser(page, email);
    await expireInviteToken(email);

    const registrationPage = new RegistrationPage(page);
    await registrationPage.gotoRegister(token);
    await registrationPage.register(TEST_PASSWORD, TEST_PASSWORD);

    await expect(registrationPage.errorBanner).toBeVisible();
    await expect(registrationPage.errorText).toHaveText('Invite link is invalid or expired');

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, TEST_PASSWORD);
    await expect(loginPage.errorBanner).toBeVisible();
  });

  test('rejects an invite token that has already been used and makes no further state change', async ({ page }) => {
    const email = uniqueTestEmail('registration-used');
    const token = await inviteUser(page, email);

    const registrationPage = new RegistrationPage(page);
    await registrationPage.gotoRegister(token);
    await registrationPage.register(TEST_PASSWORD, TEST_PASSWORD);
    await expect(page).toHaveURL(/#\/login\?registered=true$/);

    await registrationPage.gotoRegister(token);
    await registrationPage.register('SecondAttempt123', 'SecondAttempt123');

    await expect(registrationPage.errorBanner).toBeVisible();
    await expect(registrationPage.errorText).toHaveText('Invite link is invalid or expired');

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, TEST_PASSWORD);
    await expect(dashboardPage.heading).toBeVisible();
  });
});
