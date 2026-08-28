import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToTeachersPage, goToAdminUsersPage } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';
import { landingUrl } from '../../fixtures/navigation';

const PASSWORD = 'TeacherLinkPass123!';

function uniqueName(label: string): { firstName: string; surname: string } {
  return {
    firstName: `E2E-${label}`,
    surname: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

test.describe('Teacher account linking', { tag: ['@7IT5', '@7IT6', '@7IT7'] }, () => {
  test('links a Teacher-role account, and refuses a second teacher or a roleless account', async ({ page }) => {
    const accountEmail = uniqueTestEmail('link-target');
    await createRegisteredUser(page, accountEmail, PASSWORD, ['Teacher']);

    const coordinatorAccount = uniqueTestEmail('link-no-teacher-role');
    await createRegisteredUser(page, coordinatorAccount, PASSWORD, ['Coordinator']);

    const teachersPage = await goToTeachersPage(page);
    const first = uniqueName('link-first');
    const firstFullName = `${first.firstName} ${first.surname}`;
    await teachersPage.createTeacher({ ...first, linkedAccountEmail: accountEmail });

    // The link round-trips to the roster and the record.
    await expect(teachersPage.linkedAccount(firstFullName)).toHaveText(accountEmail);
    await teachersPage.openTeacher(firstFullName);

    const detailPage = new TeacherDetailPage(page);
    await expect(detailPage.accountBadge).toContainText(accountEmail);
    await expect(detailPage.linkNotice).toBeVisible();
    await expect(detailPage.linkButton).toBeHidden();
    await expect(detailPage.unlinkButton).toBeVisible();

    // An account already linked is no longer offered to a second teacher, and
    // an account without the Teacher role never was.
    await teachersPage.gotoTeachers();
    const second = uniqueName('link-second');
    const secondFullName = `${second.firstName} ${second.surname}`;
    await teachersPage.createTeacher(second);
    await teachersPage.openTeacher(secondFullName);

    await detailPage.linkButton.click();
    const offered = await detailPage.accountPicker.locator('option').allTextContents();
    expect(offered).not.toContain(accountEmail);
    expect(offered).not.toContain(coordinatorAccount);
    await detailPage.linkModal.locator('#cancelBtn').click();

    // And the server refuses them outright, not just the picker.
    const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const headers = { Authorization: `Bearer ${accessToken}` };
    const teachers = await (await page.request.get('/api/teachers', { headers })).json();
    const secondTeacherId = teachers.find(
      (t: { firstName: string; teacherId: string }) => t.firstName === second.firstName,
    ).teacherId;
    const accounts = await (await page.request.get('/api/users', { headers })).json();
    const linkedAccountId = accounts.find((u: { email: string; userId: string }) => u.email === accountEmail).userId;
    const rolelessAccountId = accounts.find(
      (u: { email: string; userId: string }) => u.email === coordinatorAccount,
    ).userId;

    const alreadyLinked = await page.request.put(`/api/teachers/${secondTeacherId}/account`, {
      headers,
      data: { accountId: linkedAccountId },
    });
    const withoutTeacherRole = await page.request.put(`/api/teachers/${secondTeacherId}/account`, {
      headers,
      data: { accountId: rolelessAccountId },
    });

    expect(alreadyLinked.status()).toBe(400);
    expect(withoutTeacherRole.status()).toBe(400);
  });

  test('permits linking and unlinking only for a Coordinator or BankingCoordinator', async ({ page }) => {
    const coordinatorTeachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('link-rbac');
    await coordinatorTeachersPage.createTeacher({ firstName, surname });
    // Wait for the create to land before reading the roster back, otherwise the
    // request races the POST it depends on.
    await expect(coordinatorTeachersPage.row(`${firstName} ${surname}`)).toBeVisible();

    const coordinatorToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const teachers = await (
      await page.request.get('/api/teachers', { headers: { Authorization: `Bearer ${coordinatorToken}` } })
    ).json();
    const teacherId = teachers.find((t: { firstName: string; teacherId: string }) => t.firstName === firstName)
      .teacherId;

    const teacherOnlyEmail = uniqueTestEmail('link-rbac-teacher');
    await createRegisteredUser(page, teacherOnlyEmail, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(teacherOnlyEmail, PASSWORD);
    await expect(page).toHaveURL(landingUrl('Teacher'));

    const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const headers = { Authorization: `Bearer ${accessToken}` };

    const link = await page.request.put(`/api/teachers/${teacherId}/account`, {
      headers,
      data: { accountId: '00000000-0000-0000-0000-000000000001' },
    });
    const unlink = await page.request.delete(`/api/teachers/${teacherId}/account`, { headers });
    const linkable = await page.request.get('/api/teachers/linkable-accounts', { headers });

    expect(link.status()).toBe(403);
    expect(unlink.status()).toBe(403);
    expect(linkable.status()).toBe(403);

    // An Admin is refused too — the area grants it nothing at all.
    const adminEmail = uniqueTestEmail('link-rbac-admin');
    await createRegisteredUser(page, adminEmail, PASSWORD, ['Admin']);
    await loginPage.gotoLogin();
    await loginPage.login(adminEmail, PASSWORD);
    await expect(page).toHaveURL(landingUrl('Admin'));

    const adminAccessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const adminLinkable = await page.request.get('/api/teachers/linkable-accounts', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(adminLinkable.status()).toBe(403);
  });
});

test.describe('Teacher role removal is blocked while a link exists', { tag: ['@7IT8'] }, () => {
  test('rejects the change and tells the Admin to unlink the teacher first', async ({ page }) => {
    const accountEmail = uniqueTestEmail('role-removal-blocked');
    await createRegisteredUser(page, accountEmail, PASSWORD, ['Teacher', 'Coordinator']);

    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('role-removal');
    await teachersPage.createTeacher({ firstName, surname, linkedAccountEmail: accountEmail });

    const adminUsersPage = await goToAdminUsersPage(page);
    await adminUsersPage.editRoles(accountEmail, ['Coordinator']);

    // The banner is its own full-width row directly above the user's own row.
    await expect(adminUsersPage.roleError).toContainText('Unlink the teacher first');
    // The refused selection is restored rather than left on screen as accepted.
    await expect(
      adminUsersPage.row(accountEmail).locator('input[type="checkbox"][value="Teacher"]'),
    ).toBeChecked();

    await page.reload();
    await expect(adminUsersPage.row(accountEmail)).toContainText('Teacher');
  });
});

test.describe('Unlinking and account deletion leave the teacher intact', { tag: ['@7IT9'] }, () => {
  test('an explicit unlink and a deleted account both clear the link, and the teacher survives', async ({
    page,
    browser,
  }) => {
    const unlinkEmail = uniqueTestEmail('unlink-explicit');
    await createRegisteredUser(page, unlinkEmail, PASSWORD, ['Teacher']);

    const teachersPage = await goToTeachersPage(page);
    const explicit = uniqueName('unlink-explicit');
    const explicitFullName = `${explicit.firstName} ${explicit.surname}`;
    await teachersPage.createTeacher({ ...explicit, linkedAccountEmail: unlinkEmail });
    await teachersPage.openTeacher(explicitFullName);

    const detailPage = new TeacherDetailPage(page);
    await detailPage.unlinkAccount();

    await expect(detailPage.accountBadge).toContainText('No login account');
    await expect(detailPage.linkButton).toBeVisible();
    await expect(detailPage.firstName()).toHaveText(explicit.firstName);

    // Re-linking, then deleting the account itself, reaches the same end state.
    await detailPage.linkAccount(unlinkEmail);
    await expect(detailPage.accountBadge).toContainText(unlinkEmail);

    // User management is a separate, unchanged area — Admin-only — and Admin
    // has no access to Teachers any longer, so it runs in its own browser
    // context rather than switching the Coordinator page above away from it.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const adminUsersPage = await goToAdminUsersPage(adminPage);
    await adminUsersPage.deactivateUser(unlinkEmail);
    await adminUsersPage.permanentlyDeleteUser(unlinkEmail);
    await adminContext.close();

    await teachersPage.gotoTeachers();
    await expect(teachersPage.row(explicitFullName)).toBeVisible();
    await teachersPage.openTeacher(explicitFullName);
    await expect(detailPage.accountBadge).toContainText('No login account');
    await expect(detailPage.firstName()).toHaveText(explicit.firstName);
  });
});
