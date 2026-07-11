import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToAdminUsersPage } from '../../../fixtures/testUsers';
import { extractTokenFromUrl } from '../../../fixtures/url';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../../pages/identity/auth/DashboardPage';

const ORIGINAL_PASSWORD = 'OriginalPass123';

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
  });

  test('activates a deactivated user, who can log in again', async ({ page }) => {
    const email = uniqueTestEmail('admin-mgmt-activate');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.deactivateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Deactivated');

    await adminUsersPage.activateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Active');

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, ORIGINAL_PASSWORD);

    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
  });
});
