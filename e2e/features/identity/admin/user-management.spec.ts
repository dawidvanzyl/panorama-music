import { test, expect } from '../../../fixtures/base';
import type { Page } from '@playwright/test';
import {
  uniqueTestEmail,
  createRegisteredUser,
  getAdminAccessToken,
  goToAdminUsersPage,
  loginAsRoles,
} from '../../../fixtures/testUsers';
import { extractTokenFromUrl } from '../../../fixtures/url';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { landingUrl, sidebarEntry } from '../../../fixtures/navigation';

const ORIGINAL_PASSWORD = 'OriginalPass123';

async function userIdByEmail(page: Page, email: string): Promise<string> {
  const adminToken = await getAdminAccessToken(page);
  const response = await page.request.get('/api/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const users = (await response.json()) as { userId: string; email: string }[];
  const user = users.find((u) => u.email === email);
  expect(user).toBeDefined();
  return user!.userId;
}

test.describe('Admin User Management Flow', { tag: '@M1.2IT4' }, () => {
  test('creates a new user from the admin users page and shows an invite URL', async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-create');
    const adminUsersPage = await goToAdminUsersPage(page);

    const inviteUrl = await adminUsersPage.createUser(email, ['Teacher']);

    expect(extractTokenFromUrl(inviteUrl)).toBeTruthy();
    await expect(adminUsersPage.status(email)).toHaveText('Pending');
  });

  test("edits a user's roles and reflects the change in the table without a page reload", async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-edit-roles');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD, ['Teacher']);

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.editRoles(email, ['Teacher', 'Admin']);

    await expect(adminUsersPage.row(email)).toContainText('Admin');
    await expect(adminUsersPage.row(email)).toContainText('Teacher');

    await adminUsersPage.editRoles(email, ['Admin']);

    await expect(adminUsersPage.row(email)).toContainText('Admin');
    await expect(adminUsersPage.row(email)).not.toContainText('Teacher');
  });

  test('deactivates an active user, who can no longer log in', async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-deactivate');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.deactivateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Deactivated');

    await page.reload();
    await expect(adminUsersPage.status(email)).toHaveText('Deactivated');

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, ORIGINAL_PASSWORD);
    await expect(loginPage.errorBanner).toBeVisible();
  });

  test('permanently deletes a deactivated user via the email-confirmation flow', async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-delete');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.deactivateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Deactivated');

    await adminUsersPage.permanentlyDeleteUser(email);
    await expect(adminUsersPage.row(email)).toHaveCount(0);

    await page.reload();
    await expect(page.locator('.users-table__status').first()).toBeVisible();
    await expect(adminUsersPage.row(email)).toHaveCount(0);
  });

  test('activates a deactivated user, who can log in again', async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-activate');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.deactivateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Deactivated');

    await adminUsersPage.activateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Active');

    await page.reload();
    await expect(adminUsersPage.status(email)).toHaveText('Active');

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, ORIGINAL_PASSWORD);

    await expect(page).toHaveURL(landingUrl('Teacher'));
    await expect(sidebarEntry(page, 'studentManagementLink')).toBeVisible();
  });

  test('refuses a delete request on an active user and leaves the user active', async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-delete-active');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);
    const userId = await userIdByEmail(page, email);
    const adminToken = await getAdminAccessToken(page);

    const response = await page.request.delete(`/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.status()).toBe(400);

    const adminUsersPage = await goToAdminUsersPage(page);
    await expect(adminUsersPage.status(email)).toHaveText('Active');
  });

  test('refuses a non-Admin caller on deactivate, delete and activate with no state change', async ({
    page,
  }) => {
    const activeEmail = uniqueTestEmail('admin-mgmt-rbac-active');
    const deactivatedEmail = uniqueTestEmail('admin-mgmt-rbac-inactive');
    await createRegisteredUser(page, activeEmail, ORIGINAL_PASSWORD);
    await createRegisteredUser(page, deactivatedEmail, ORIGINAL_PASSWORD);
    const activeId = await userIdByEmail(page, activeEmail);
    const deactivatedId = await userIdByEmail(page, deactivatedEmail);

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.deactivateUser(deactivatedEmail);
    await expect(adminUsersPage.status(deactivatedEmail)).toHaveText('Deactivated');

    await loginAsRoles(page, ['Teacher']);
    const teacherToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const headers = { Authorization: `Bearer ${teacherToken}` };

    const deactivate = await page.request.patch(`/api/users/${activeId}/deactivate`, { headers });
    const remove = await page.request.delete(`/api/users/${deactivatedId}`, { headers });
    const activate = await page.request.patch(`/api/users/${deactivatedId}/activate`, { headers });

    expect(deactivate.status()).toBe(403);
    expect(remove.status()).toBe(403);
    expect(activate.status()).toBe(403);

    const observed = await goToAdminUsersPage(page);
    await expect(observed.status(activeEmail)).toHaveText('Active');
    await expect(observed.status(deactivatedEmail)).toHaveText('Deactivated');
  });
});

test.describe('Coordinator Role Assignment', { tag: '@6IT7' }, () => {
  test('assigns the Coordinator role to a user and reflects it on the user', async ({ page }) => {
    const email = uniqueTestEmail('coordinator-assign');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD, ['Teacher']);

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.editRoles(email, ['Teacher', 'Coordinator']);

    await expect(adminUsersPage.row(email)).toContainText('Teacher');
    await expect(adminUsersPage.row(email)).toContainText('Coordinator');
  });
});
