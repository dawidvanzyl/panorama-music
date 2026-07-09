import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToAdminUsersPage } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../pages/identity/auth/DashboardPage';
import { ActivityLogPage } from '../../pages/identity/admin/ActivityLogPage';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';
const PASSWORD = 'ActivityLogPass123!';

test.describe('Admin Activity Log — audited admin actions', { tag: '@M1.5IT1' }, () => {
  test('shows actor, target, action, and timestamp for a user-management action', async ({ page }) => {
    const email = uniqueTestEmail('activity-log-target');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const adminUsersPage = await goToAdminUsersPage(page);
    await expect(adminUsersPage.status(email)).toHaveText('Active');
    await adminUsersPage.deactivateUser(email);
    await expect(adminUsersPage.status(email)).toHaveText('Deactivated');

    const activityLogPage = new ActivityLogPage(page);
    await activityLogPage.gotoActivityLog();

    const deactivatedRow = activityLogPage.rowByText(email).filter({ hasText: 'identity.user.deactivated' });
    await expect(deactivatedRow).toHaveCount(1);
    await expect(deactivatedRow).toContainText(ADMIN_EMAIL);
    await expect(deactivatedRow.locator('td').first()).not.toBeEmpty();
  });
});

test.describe('Admin Activity Log — authentication events', { tag: '@M1.5IT2' }, () => {
  test('shows distinct entries for a successful and a failed login; failure shows a reason category and never the password', async ({ page }) => {
    const email = uniqueTestEmail('activity-log-auth');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    await page.evaluate(() => localStorage.clear());
    await loginPage.gotoLogin();
    await loginPage.login(email, 'WrongPassword123!');
    await expect(loginPage.errorBanner).toBeVisible();

    await loginPage.gotoLogin();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    const activityLogPage = new ActivityLogPage(page);
    await activityLogPage.gotoActivityLog();

    await activityLogPage.applyFilters({ actor: email, eventType: 'identity.user.login_succeeded' });
    const successRow = activityLogPage.rowByText(email);
    await expect(successRow).toHaveCount(1);
    await expect(successRow).toContainText('Success');

    // Clear the actor field directly and apply in the same step — clicking
    // the Clear button separately would fire its own reload, racing the
    // subsequent Apply's request and letting whichever response lands last
    // (not necessarily the filtered one) win.
    await activityLogPage.actorInput.fill('');
    await activityLogPage.applyFilters({ eventType: 'identity.user.login_failed' });
    const failedRow = activityLogPage.rowByText(email);
    await expect(failedRow).toHaveCount(1);
    await expect(failedRow).toContainText('Failure');
    await expect(failedRow).toContainText('InvalidCredentials');

    await expect(page.locator('body')).not.toContainText('WrongPassword123!');
  });
});

test.describe('Admin Activity Log — admin-only access', { tag: '@M1.5IT3' }, () => {
  test('denies a non-admin user both the Activity Log page and its API', async ({ page }) => {
    const email = uniqueTestEmail('activity-log-rbac');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    await page.goto('/#/admin/activity-log');
    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
    await expect(page.getByText('Activity Log').first()).toBeHidden();

    const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const response = await page.request.get('/api/audit', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe('Admin Activity Log — filtering and pagination', { tag: '@M1.5IT4' }, () => {
  // Fixed, deterministic non-UTC offset (Johannesburg does not observe DST)
  // so the date-range filter's local-to-UTC conversion below is asserted
  // against a known offset regardless of the host machine's own timezone.
  test.use({ timezoneId: 'Africa/Johannesburg' });

  test('filters by actor, event type, and date range, and paginates correctly', async ({ page, request }) => {
    test.setTimeout(60000);

    const email = uniqueTestEmail('activity-log-paging');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    // 25 more successful logins for the same account, giving it 26
    // login_succeeded events total — one page (25) plus a second page (1).
    await Promise.all(Array.from({ length: 25 }, () =>
      request.post('/api/auth/login', { data: { email, password: PASSWORD } })));

    await loginPage.gotoLogin();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    const activityLogPage = new ActivityLogPage(page);
    await activityLogPage.gotoActivityLog();
    await activityLogPage.applyFilters({ actor: email, eventType: 'identity.user.login_succeeded' });

    await expect(activityLogPage.rows).toHaveCount(25);
    await expect(activityLogPage.footerLabel).toHaveText('Showing 1-25 of 26');
    await expect(activityLogPage.prevButton).toBeDisabled();
    await expect(activityLogPage.nextButton).toBeEnabled();

    await activityLogPage.nextButton.click();
    await expect(activityLogPage.rows).toHaveCount(1);
    await expect(activityLogPage.footerLabel).toHaveText('Showing 26-26 of 26');
    await expect(activityLogPage.nextButton).toBeDisabled();

    await activityLogPage.prevButton.click();
    await expect(activityLogPage.rows).toHaveCount(25);

    // Checked in this order deliberately: yesterday first (a real negative
    // case — none of this test's events exist yet at that point) so the
    // transition to an empty result is actually observed, rather than
    // asserting a value that was already on screen from a prior step and
    // could pass on stale DOM before the filtered response even arrives.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await activityLogPage.applyFilters({ actor: email, eventType: 'identity.user.login_succeeded', from: yesterday, to: yesterday });
    await expect(activityLogPage.emptyState).toBeVisible();

    const today = new Date().toISOString().slice(0, 10);
    const [auditRequest] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/audit') && req.url().includes('from=')),
      activityLogPage.applyFilters({ from: today, to: today }),
    ]);
    await expect(activityLogPage.rows).toHaveCount(25);
    await expect(activityLogPage.footerLabel).toHaveText('Showing 1-25 of 26');

    // Proves the filter bar's conversion is timezone-aware, not just the
    // table's display: with the browser forced to UTC+2, the outgoing
    // request must carry local midnight/end-of-day for `today` converted to
    // UTC — not a bare UTC calendar day.
    const auditUrl = new URL(auditRequest.url());
    const expectedFrom = new Date(`${today}T00:00:00+02:00`).toISOString();
    const expectedTo = new Date(`${today}T23:59:59.999+02:00`).toISOString();
    expect(auditUrl.searchParams.get('from')).toBe(expectedFrom);
    expect(auditUrl.searchParams.get('to')).toBe(expectedTo);
  });
});
