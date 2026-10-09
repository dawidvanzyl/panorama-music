import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import { landingUrl, sidebarEntry } from '../../fixtures/navigation';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../pages/identity/auth/DashboardPage';
import type { Page } from '@playwright/test';

const RETIRED_ROUTE = '/#/sessions';

async function expectNoLoginForm(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await expect(loginPage.emailInput).toBeHidden();
  await expect(loginPage.passwordInput).toBeHidden();
  await expect(loginPage.submitButton).toBeHidden();
}

test.describe(
  'An unknown route never shows a signed-in user a login form',
  { tag: ['@251IT1'] },
  () => {
    test('a retired route opened from inside a live session returns the user to their landing screen', async ({
      page,
    }) => {
      await loginAsRoles(page, ['Teacher']);
      const dashboardPage = new DashboardPage(page);

      await page.goto(RETIRED_ROUTE);

      await expect(page).toHaveURL(landingUrl('Teacher'));
      await expectNoLoginForm(page);
      await expect(sidebarEntry(page, 'studentManagementLink')).toBeVisible();
      await expect(dashboardPage.accountChip).toBeVisible();
    });

    test('a retired route opened as a fresh page load in a new tab returns the user to their landing screen', async ({
      page,
    }) => {
      await loginAsRoles(page, ['Teacher']);

      const bookmarkTab = await page.context().newPage();
      await bookmarkTab.goto(RETIRED_ROUTE);

      await expect(bookmarkTab).toHaveURL(landingUrl('Teacher'));
      await expectNoLoginForm(bookmarkTab);
      await expect(new DashboardPage(bookmarkTab).accountChip).toBeVisible();
    });

    test('the session is still live afterwards and the user can move on by clicking', async ({
      page,
    }) => {
      await loginAsRoles(page, ['Teacher']);
      const dashboardPage = new DashboardPage(page);

      await page.goto(RETIRED_ROUTE);
      await expect(page).toHaveURL(landingUrl('Teacher'));

      await sidebarEntry(page, 'waitingListLink').click();

      await expect(page).toHaveURL(/#\/waiting-list$/);
      await expect(page.getByRole('heading', { name: 'Waiting List' })).toBeVisible();

      await page.reload();

      await expect(page).toHaveURL(/#\/waiting-list$/);
      await expectNoLoginForm(page);
      await expect(dashboardPage.accountChip).toBeVisible();
    });

    test('a valid session whose access token has expired still returns the user to their landing screen', async ({
      page,
    }) => {
      await loginAsRoles(page, ['Teacher']);
      const dashboardPage = new DashboardPage(page);

      await page.evaluate(() => {
        localStorage.setItem('pm_expires_at', new Date(Date.now() - 1000).toISOString());
      });

      // A hash-only goto from the app's own document would not reload it, so
      // the page leaves the app first and the retired route is a real load.
      await page.goto('/api/health');
      await page.goto(RETIRED_ROUTE);

      await expect(page).toHaveURL(landingUrl('Teacher'));
      await expectNoLoginForm(page);
      await expect(dashboardPage.accountChip).toBeVisible();
    });

    test('an unknown path beneath a registered area returns the user to their landing screen', async ({
      page,
    }) => {
      await loginAsRoles(page, ['Teacher']);

      await page.goto('/#/students/no-such-screen');

      await expect(page).toHaveURL(landingUrl('Teacher'));
      await expectNoLoginForm(page);
    });

    test('a signed-out visitor who opens a retired route still arrives at the login screen', async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      await page.goto(RETIRED_ROUTE);

      await expect(page).toHaveURL(/#\/login$/);
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(dashboardPage.accountChip).toBeHidden();
    });
  },
);
