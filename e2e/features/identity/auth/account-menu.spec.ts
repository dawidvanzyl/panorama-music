import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToTeachersPage } from '../../../fixtures/testUsers';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../../pages/identity/auth/DashboardPage';
import { SessionsPage } from '../../../pages/identity/auth/SessionsPage';
import { AdminUsersPage } from '../../../pages/identity/admin/AdminUsersPage';
import { MyDetailsPage } from '../../../pages/teachers/MyDetailsPage';
import { landingUrl } from '../../../fixtures/navigation';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';
const PASSWORD = 'AccountMenuPass123!';

/**
 * Creates a teacher as a Coordinator and links it to a freshly registered
 * Teacher-role account, without signing in as that account.
 */
async function createLinkedTeacher(
  page: import('@playwright/test').Page,
  label: string,
): Promise<{ email: string; firstName: string; surname: string }> {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

  const teachersPage = await goToTeachersPage(page);
  const firstName = `E2E-${label}`;
  const surname = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  await teachersPage.createTeacher({ firstName, surname, linkedAccountEmail: email });
  await expect(teachersPage.row(`${firstName} ${surname}`)).toBeVisible();

  return { email, firstName, surname };
}

test.describe('Own sessions from the account menu', () => {
  test(
    'opens over the page the user is on and leaves it intact on close',
    { tag: '@247IT1' },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.gotoLogin();
      await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      await expect(page).toHaveURL(landingUrl('Admin'));

      // Any screen other than the one signing in lands on will do — the point
      // is that opening the dialog is not a navigation.
      const adminUsersPage = new AdminUsersPage(page);
      await adminUsersPage.gotoAdminUsers();
      await expect(adminUsersPage.emailInput).toBeVisible();
      const urlBefore = page.url();

      const sessionsPage = new SessionsPage(page);
      await sessionsPage.openSessions();

      await expect(sessionsPage.heading).toBeVisible();
      await expect(sessionsPage.currentRow()).toHaveCount(1);
      expect(page.url()).toBe(urlBefore);

      await sessionsPage.close();

      // The screen underneath was never left, so it is still there and still current.
      expect(page.url()).toBe(urlBefore);
      await expect(adminUsersPage.emailInput).toBeVisible();
    },
  );
});

test.describe('Logout from the account menu', () => {
  test(
    'leaves none of the previous user’s cached data behind for the next sign-in on the same tab',
    { tag: '@247IT2' },
    async ({ page }) => {
      const first = await createLinkedTeacher(page, 'menu-cache-a');
      const second = await createLinkedTeacher(page, 'menu-cache-b');

      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      const myDetails = new MyDetailsPage(page);

      // The first teacher signs in and loads their own record, filling the cache
      // the account menu reads on every page.
      await loginPage.gotoLogin();
      await loginPage.login(first.email, PASSWORD);
      await expect(page).toHaveURL(landingUrl('Teacher'));
      await myDetails.open();
      await expect(myDetails.firstName()).toHaveText(first.firstName);
      await myDetails.close();

      await dashboardPage.logout();
      await expect(page).toHaveURL(/#\/login$/);

      // The second teacher signs in on the same tab, with no reload in between.
      await loginPage.login(second.email, PASSWORD);
      await expect(page).toHaveURL(landingUrl('Teacher'));
      await myDetails.open();

      await expect(myDetails.firstName()).toHaveText(second.firstName);
      await expect(myDetails.modal).toContainText(second.email);
      await expect(myDetails.modal).not.toContainText(first.firstName);
      await expect(myDetails.modal).not.toContainText(first.email);
    },
  );
});
