import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToAdminUsersPage } from '../../../fixtures/testUsers';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../../pages/identity/auth/DashboardPage';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';

test.describe('Session Flow', { tag: '@M1.2IT1' }, () => {
  test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.gotoLogin();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.logoutButton).toBeVisible();
  });

  test('shows an error and keeps the user on the login page for an incorrect password', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();

    await loginPage.login(ADMIN_EMAIL, 'definitely-wrong-password');

    await expect(loginPage.errorBanner).toBeVisible();
    await expect(loginPage.errorText).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/#\/login$/);
  });

  test('shows an error and keeps the user on the login page for a non-existent email', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();

    await loginPage.login('nonexistent-user@panorama-music.qa', 'whatever-password');

    await expect(loginPage.errorBanner).toBeVisible();
    await expect(loginPage.errorText).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/#\/login$/);
  });

  test('logs out, ends the session, and blocks further access to authenticated routes', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.gotoLogin();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(dashboardPage.heading).toBeVisible();

    await dashboardPage.logout();
    await expect(page).toHaveURL(/#\/login$/);

    await dashboardPage.gotoDashboard();
    await expect(page).toHaveURL(/#\/login$/);
  });

  test('continues the session transparently via refresh token rotation when the access token expires', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.gotoLogin();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(dashboardPage.heading).toBeVisible();

    // Simulate the 15-minute access token lifetime elapsing while the real,
    // DB-backed refresh token (7-day lifetime) remains valid — waiting out
    // the actual 15 minutes is impractical for a test run.
    await page.evaluate(() => {
      localStorage.setItem('pm_expires_at', new Date(Date.now() - 1000).toISOString());
    });

    // Reload so the router re-evaluates auth state from scratch — a plain
    // goto() back to the same '#/' hash would be a no-op (no hashchange).
    await page.reload();

    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.logoutButton).toBeVisible();
  });
});

test.describe('Token Revocation', () => {
  test('denies a protected API action with the previous access token after logging out', { tag: '@M1.4IT1' }, async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.gotoLogin();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(dashboardPage.heading).toBeVisible();

    const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));

    await dashboardPage.logout();
    await expect(page).toHaveURL(/#\/login$/);

    const response = await page.request.get('/api/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status()).toBe(401);
  });

  test('denies a protected API action for a user whose session was active when an admin deactivates them', { tag: '@M1.4IT2' }, async ({ page, browser }) => {
    const email = uniqueTestEmail('session-deactivate');
    const password = 'SessionDeactivate123';
    await createRegisteredUser(page, email, password);

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    const userLoginPage = new LoginPage(userPage);
    const userDashboardPage = new DashboardPage(userPage);
    await userLoginPage.gotoLogin();
    await userLoginPage.login(email, password);
    await expect(userDashboardPage.heading).toBeVisible();

    const accessToken = await userPage.evaluate(() => localStorage.getItem('pm_access_token'));

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.deactivateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Deactivated');

    const response = await userPage.request.get('/api/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status()).toBe(401);

    await userContext.close();
  });
});
