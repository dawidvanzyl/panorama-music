import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser } from '../../../fixtures/testUsers';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { SessionsPage } from '../../../pages/identity/auth/SessionsPage';
import { AdminSessionsPage } from '../../../pages/identity/admin/AdminSessionsPage';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';

test.describe('My Active Sessions', () => {
  test(
    'a user can view their own sessions and revoke one, ending it immediately',
    { tag: '@M1.4IT5' },
    async ({ page, browser }) => {
      const email = uniqueTestEmail('own-sessions');
      const password = 'OwnSessions123';
      await createRegisteredUser(page, email, password);

      const loginPage = new LoginPage(page);
      await loginPage.gotoLogin();
      await loginPage.login(email, password);
      await expect(page).toHaveURL(/#\/$/);

      const otherContext = await browser.newContext();
      const otherPage = await otherContext.newPage();
      const otherLoginPage = new LoginPage(otherPage);
      await otherLoginPage.gotoLogin();
      await otherLoginPage.login(email, password);
      await expect(otherPage).toHaveURL(/#\/$/);
      const otherAccessToken = await otherPage.evaluate(() =>
        localStorage.getItem('pm_access_token')
      );

      const sessionsPage = new SessionsPage(page);
      await sessionsPage.gotoSessions();
      await expect(sessionsPage.heading).toBeVisible();
      await expect(sessionsPage.rows).toHaveCount(2);
      await expect(sessionsPage.currentRow()).toHaveCount(1);

      const otherRow = sessionsPage.rows.filter({ hasNotText: 'Current Session' });
      await sessionsPage.revokeRow(otherRow);
      await expect(sessionsPage.rows).toHaveCount(1);

      const response = await otherPage.request.get('/api/users', {
        headers: { Authorization: `Bearer ${otherAccessToken}` },
      });
      expect(response.status()).toBe(401);

      await otherContext.close();
    }
  );
});

test.describe('Global Session Management', () => {
  test(
    "an admin can view every user's active sessions and revoke one individually",
    { tag: '@M1.4IT6' },
    async ({ page, browser }) => {
      const email = uniqueTestEmail('admin-view-sessions');
      const password = 'AdminViewSessions123';
      await createRegisteredUser(page, email, password);

      const userContext = await browser.newContext();
      const userPage = await userContext.newPage();
      const userLoginPage = new LoginPage(userPage);
      await userLoginPage.gotoLogin();
      await userLoginPage.login(email, password);
      await expect(userPage).toHaveURL(/#\/$/);
      const userAccessToken = await userPage.evaluate(() =>
        localStorage.getItem('pm_access_token')
      );

      const adminLoginPage = new LoginPage(page);
      await adminLoginPage.gotoLogin();
      await adminLoginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      await expect(page).toHaveURL(/#\/$/);

      const adminSessionsPage = new AdminSessionsPage(page);
      await adminSessionsPage.gotoAdminSessions();
      await expect(adminSessionsPage.heading).toBeVisible();

      await adminSessionsPage.filterInput.fill(email);
      const userRow = adminSessionsPage.rowByEmail(email);
      await expect(userRow).toHaveCount(1);

      await adminSessionsPage.revokeRow(userRow);
      await expect(adminSessionsPage.rowByEmail(email)).toHaveCount(0);

      const response = await userPage.request.get('/api/users', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      });
      expect(response.status()).toBe(401);

      await userContext.close();
    }
  );

  test(
    'rejects a non-admin request for the global session list',
    { tag: '@M1.4UC10' },
    async ({ page }) => {
      const email = uniqueTestEmail('non-admin-sessions');
      const password = 'NonAdminSessions123';
      await createRegisteredUser(page, email, password);

      const loginPage = new LoginPage(page);
      await loginPage.gotoLogin();
      await loginPage.login(email, password);
      await expect(page).toHaveURL(/#\/$/);

      const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));

      const response = await page.request.get('/api/auth/admin/sessions', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status()).toBe(403);
    }
  );

  test(
    '"Revoke All (Global)" ends every other session but keeps the admin\'s own current session valid',
    { tag: '@M1.4UC9' },
    async ({ page, browser }) => {
      const email = uniqueTestEmail('revoke-all-global');
      const password = 'RevokeAllGlobal123';
      await createRegisteredUser(page, email, password);

      const userContext = await browser.newContext();
      const userPage = await userContext.newPage();
      const userLoginPage = new LoginPage(userPage);
      await userLoginPage.gotoLogin();
      await userLoginPage.login(email, password);
      await expect(userPage).toHaveURL(/#\/$/);
      const userAccessToken = await userPage.evaluate(() =>
        localStorage.getItem('pm_access_token')
      );

      const adminLoginPage = new LoginPage(page);
      await adminLoginPage.gotoLogin();
      await adminLoginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      await expect(page).toHaveURL(/#\/$/);
      const adminAccessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));

      const adminSessionsPage = new AdminSessionsPage(page);
      await adminSessionsPage.gotoAdminSessions();
      await adminSessionsPage.revokeAllGlobal();

      const userResponse = await userPage.request.get('/api/users', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      });
      expect(userResponse.status()).toBe(401);

      const adminResponse = await page.request.get('/api/users', {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });
      expect(adminResponse.status()).toBe(200);

      await userContext.close();
    }
  );
});
