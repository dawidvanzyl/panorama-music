import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToAdminUsersPage } from '../../../fixtures/testUsers';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../../pages/identity/auth/DashboardPage';

const PASSWORD = 'NonAdminPass123';

test.describe('Role-Based Access Control', { tag: '@M1.2IT6' }, () => {
  test('denies a non-admin user direct navigation to an admin-only page route', async ({ page }) => {
    const email = uniqueTestEmail('rbac-ui');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    await page.goto('/#/admin/users');

    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
    await expect(page.getByText('User Management').first()).not.toBeVisible();
    await expect(page.locator('#adminLink')).toBeHidden();
  });

  test('rejects an admin-only API call from a non-admin session with no state change', async ({ page }) => {
    const email = uniqueTestEmail('rbac-api');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const attemptedEmail = uniqueTestEmail('rbac-api-target');

    const response = await page.request.post('/api/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { email: attemptedEmail, roles: ['Teacher'] },
    });

    expect(response.status()).toBe(403);

    const adminUsersPage = await goToAdminUsersPage(page);
    await expect(adminUsersPage.row(attemptedEmail)).toHaveCount(0);
  });
});
