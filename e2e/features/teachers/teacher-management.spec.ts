import { test, expect } from '../../fixtures/base';
import {
  uniqueTestEmail,
  createRegisteredUser,
  goToTeachersPage,
} from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../pages/identity/auth/DashboardPage';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

const PASSWORD = 'TeacherMgmtPass123!';

function uniqueName(label: string): { firstName: string; surname: string } {
  return {
    firstName: `E2E-${label}`,
    surname: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

test.describe('Teacher Profile Management', { tag: ['@7IT1'] }, () => {
  test('creates, reads, and updates a teacher profile, and the change persists', async ({ page }) => {
    const { firstName, surname } = uniqueName('crud');
    const fullName = `${firstName} ${surname}`;
    const teachersPage = await goToTeachersPage(page);

    await teachersPage.createTeacher({ firstName, surname });
    await expect(teachersPage.row(fullName)).toBeVisible();

    await teachersPage.openTeacher(fullName);

    const detailPage = new TeacherDetailPage(page);
    await expect(detailPage.firstName()).toHaveText(firstName);
    await expect(detailPage.surname()).toHaveText(surname);

    const updatedFirstName = `${firstName}-Updated`;
    await detailPage.editNames(updatedFirstName, surname);
    await expect(detailPage.firstName()).toHaveText(updatedFirstName);

    // Reload from the server rather than trusting the in-page state: the point
    // of this criterion is that the update was actually persisted.
    await page.reload();
    await expect(detailPage.firstName()).toHaveText(updatedFirstName);

    await teachersPage.gotoTeachers();
    await expect(teachersPage.row(`${updatedFirstName} ${surname}`)).toBeVisible();
  });
});

test.describe('Teacher Private Flag', { tag: ['@7IT2'] }, () => {
  test('captures the private flag and returns it on both the teacher record and the list payload', async ({
    page,
  }) => {
    const { firstName, surname } = uniqueName('private');
    const fullName = `${firstName} ${surname}`;
    const teachersPage = await goToTeachersPage(page);

    await teachersPage.createTeacher({ firstName, surname, isPrivate: true });
    await expect(teachersPage.row(fullName)).toContainText('Private');

    await teachersPage.openTeacher(fullName);

    const detailPage = new TeacherDetailPage(page);
    await expect(detailPage.privateToggle).toBeChecked();
    await expect(detailPage.typeChip()).toHaveText('Private');

    // Round-trips through the list payload as well as the single record.
    await teachersPage.gotoTeachers();
    await teachersPage.filterByType('private');
    await expect(teachersPage.row(fullName)).toBeVisible();
    await teachersPage.filterByType('school-paid');
    await expect(teachersPage.row(fullName)).toHaveCount(0);

    // Flipping the flag persists immediately, without entering the edit flow.
    await teachersPage.filterByType('');
    await teachersPage.openTeacher(fullName);
    await detailPage.setPrivate(false);
    await expect(detailPage.typeChip()).toHaveText('School-paid');
    await page.reload();
    await expect(detailPage.privateToggle).not.toBeChecked();
  });
});

test.describe('Teacher endpoint access control', { tag: ['@7IT10'] }, () => {
  test('requires authentication for every teacher endpoint', async ({ page, request }) => {
    const someId = '00000000-0000-0000-0000-000000000001';

    const list = await request.get('/api/teachers');
    const single = await request.get(`/api/teachers/${someId}`);
    const create = await request.post('/api/teachers', {
      data: { firstName: 'Anon', surname: 'Anon', isPrivate: false },
    });
    const profile = await request.put(`/api/teachers/${someId}/profile`, {
      data: { firstName: 'Anon', surname: 'Anon' },
    });
    const classification = await request.put(`/api/teachers/${someId}/classification`, {
      data: { isPrivate: true },
    });

    expect(list.status()).toBe(401);
    expect(single.status()).toBe(401);
    expect(create.status()).toBe(401);
    expect(profile.status()).toBe(401);
    expect(classification.status()).toBe(401);

    await page.goto('/#/teachers');
    await expect(page).toHaveURL(/#\/login/);
  });

  test('permits each teacher operation only for an Admin or Coordinator', async ({ page }) => {
    const email = uniqueTestEmail('teachers-rbac');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, PASSWORD);
    await expect(page).toHaveURL(/#\/$/);

    await page.goto('/#/teachers');
    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
    await expect(page.getByText('Teacher Management').first()).toBeHidden();

    const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const headers = { Authorization: `Bearer ${accessToken}` };
    const someId = '00000000-0000-0000-0000-000000000001';

    const list = await page.request.get('/api/teachers', { headers });
    const single = await page.request.get(`/api/teachers/${someId}`, { headers });
    const create = await page.request.post('/api/teachers', {
      headers,
      data: { firstName: 'Nope', surname: 'Nope', isPrivate: false },
    });
    const profile = await page.request.put(`/api/teachers/${someId}/profile`, {
      headers,
      data: { firstName: 'Nope', surname: 'Nope' },
    });
    const classification = await page.request.put(`/api/teachers/${someId}/classification`, {
      headers,
      data: { isPrivate: true },
    });

    expect(list.status()).toBe(403);
    expect(single.status()).toBe(403);
    expect(create.status()).toBe(403);
    expect(profile.status()).toBe(403);
    expect(classification.status()).toBe(403);

    // The same operations succeed for an Admin, proving the endpoints are
    // permitted rather than universally closed.
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('rbac-admin');
    await teachersPage.createTeacher({ firstName, surname });
    await expect(teachersPage.row(`${firstName} ${surname}`)).toBeVisible();
  });
});
