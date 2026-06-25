import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/base';
import { expireInviteToken } from '../../../fixtures/db';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../../pages/identity/auth/DashboardPage';
import { RegistrationPage } from '../../../pages/identity/auth/RegistrationPage';
import { AdminUsersPage, extractInviteToken } from '../../../pages/identity/admin/AdminUsersPage';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';
const TEST_PASSWORD = 'TestPass123';

function uniqueInviteeEmail(label: string): string {
  return `e2e-registration-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@panorama-music.qa`;
}

async function inviteUser(page: Page, email: string): Promise<string> {
  const loginPage = new LoginPage(page);
  const adminUsersPage = new AdminUsersPage(page);

  await loginPage.gotoLogin();
  await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/#\/$/);

  await adminUsersPage.gotoAdminUsers();
  const inviteUrl = await adminUsersPage.createUser(email, ['Teacher']);
  return extractInviteToken(inviteUrl);
}

test.describe('Registration Flow', { tag: '@M1.2IT2' }, () => {
  test('completes registration via a valid invite link and activates the account', async ({ page }) => {
    const email = uniqueInviteeEmail('valid');
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
    const email = uniqueInviteeEmail('expired');
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
    const email = uniqueInviteeEmail('used');
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
