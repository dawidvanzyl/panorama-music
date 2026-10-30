import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, loginAsRoles } from '../../../fixtures/testUsers';
import { signInOtherUser } from '../../../fixtures/otherUserSession';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { AdminSessionsPage } from '../../../pages/identity/admin/AdminSessionsPage';
import { landingUrl } from '../../../fixtures/navigation';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';

// A real revoke all ends every other session in the system, so the two
// scenarios here must never run at the same time.
test.describe.configure({ mode: 'serial' });

test.describe('Global Session Management — revoke all', () => {
  test(
    '"Revoke All" ends every other session but keeps the admin\'s own current session valid',
    { tag: '@M1.4IT7' },
    async ({ page, browser }) => {
      const email = uniqueTestEmail('revoke-all-global');
      const password = 'RevokeAllGlobal123';
      await createRegisteredUser(page, email, password);

      const userContext = await browser.newContext();
      const userPage = await userContext.newPage();
      const userLoginPage = new LoginPage(userPage);
      await userLoginPage.gotoLogin();
      await userLoginPage.login(email, password);
      await expect(userPage).toHaveURL(landingUrl('Teacher'));
      const userAccessToken = await userPage.evaluate(() =>
        localStorage.getItem('pm_access_token')
      );

      const adminLoginPage = new LoginPage(page);
      await adminLoginPage.gotoLogin();
      await adminLoginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      await expect(page).toHaveURL(landingUrl('Admin'));
      const adminAccessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));

      const adminSessionsPage = new AdminSessionsPage(page);
      await adminSessionsPage.gotoAdminSessions();
      await adminSessionsPage.revokeAllGlobal();
      await expect(adminSessionsPage.rowByEmail(email)).toHaveCount(0);

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

test.describe('Revoke All Sessions modal — exact phrase revokes', { tag: ['@266IT54'] }, () => {
  test('S1 the exact phrase revokes every other session and keeps the admin\'s own', async ({
    page,
    browser,
  }) => {
    const first = await signInOtherUser(page, browser, 'revoke-phrase-a', 'RevokePhraseA123');
    const second = await signInOtherUser(page, browser, 'revoke-phrase-b', 'RevokePhraseB123');
    await loginAsRoles(page, ['Admin']);
    const adminAccessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const sessionsPage = new AdminSessionsPage(page);
    await sessionsPage.gotoAdminSessions();
    await expect(sessionsPage.heading).toBeVisible();

    await sessionsPage.revokeAllBtn.click();
    await sessionsPage.revokeAllModalConfirmInput.fill('REVOKE ALL');
    await sessionsPage.revokeAllModalConfirmButton.click();

    await expect(page.locator('#revokeAllModal .modal__card')).toBeHidden();
    for (const other of [first, second]) {
      await sessionsPage.filterInput.fill(other.email);
      await expect(sessionsPage.rowByEmail(other.email)).toHaveCount(0);
      const response = await page.request.get('/api/users', {
        headers: { Authorization: `Bearer ${other.accessToken}` },
      });
      expect(response.status()).toBe(401);
    }
    const adminResponse = await page.request.get('/api/users', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(adminResponse.status()).toBe(200);

    await page.reload();
    await expect(page).toHaveURL(/#\/admin\/sessions/);
    await expect(sessionsPage.heading).toBeVisible();
    for (const other of [first, second]) {
      await sessionsPage.filterInput.fill(other.email);
      await expect(sessionsPage.rowByEmail(other.email)).toHaveCount(0);
    }

    await first.context.close();
    await second.context.close();
  });
});
