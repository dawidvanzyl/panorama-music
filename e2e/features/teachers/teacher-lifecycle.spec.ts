import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToTeachersPage } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { TeachersPage } from '../../pages/teachers/TeachersPage';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';
import { landingUrl } from '../../fixtures/navigation';

const PASSWORD = 'TeacherLifecyclePass123!';
const ACCOUNT_NUMBER = '1234567890';
const LAST4 = '7890';

const BANKING = {
  bank: 'StandardBank',
  accountType: 'Savings',
  branchCode: '051001',
  accountNumber: ACCOUNT_NUMBER,
};

function uniqueName(label: string): { firstName: string; surname: string } {
  return {
    firstName: `E2E-${label}`,
    surname: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

async function authHeaders(page: import('@playwright/test').Page): Promise<{ Authorization: string }> {
  const accessToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
  return { Authorization: `Bearer ${accessToken}` };
}

/** Looks the teacher up by surname — the half of uniqueName() that is actually unique. */
async function teacherIdBySurname(page: import('@playwright/test').Page, surname: string): Promise<string> {
  const response = await page.request.get('/api/teachers', { headers: await authHeaders(page) });
  const teachers = (await response.json()) as { surname: string; teacherId: string }[];
  const teacher = teachers.find((candidate) => candidate.surname === surname);

  expect(teacher, `No teacher found with surname ${surname}`).toBeDefined();

  return teacher!.teacherId;
}

test.describe('Deactivation deletes the banking details and preserves the teacher', { tag: ['@7IT3'] }, () => {
  test('removes the details in the same operation while the record and its history survive', async ({ page }) => {
    // A real Teacher-role account, so the relink below is refused for the
    // deactivation and not merely because the account does not exist.
    const relinkEmail = uniqueTestEmail('lifecycle-relink');
    await createRegisteredUser(page, relinkEmail, PASSWORD, ['Teacher']);

    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('lifecycle-deactivate');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(fullName);

    const detailPage = new TeacherDetailPage(page);
    await detailPage.captureBankingDetails(BANKING);
    await expect(detailPage.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);

    const teacherId = await teacherIdBySurname(page, surname);

    await detailPage.deactivate();

    await expect(detailPage.statusChip).toHaveText('Deactivated');
    await expect(detailPage.bankingEmptyState).toBeVisible();
    // None may be captured while a teacher is inactive.
    await expect(detailPage.bankingAddButton).toBeHidden();

    // Read back from the server rather than trusting the in-page state: the
    // point is that both halves of the operation actually persisted.
    const record = (await (
      await page.request.get(`/api/teachers/${teacherId}`, { headers: await authHeaders(page) })
    ).json()) as { isActive: boolean; banking: unknown | null; firstName: string };

    expect(record.isActive).toBe(false);
    expect(record.banking).toBeNull();
    expect(record.firstName).toBe(firstName);

    // A link grants self-service access to the record and its banking details,
    // so it cannot be handed to a teacher who has been stood down — withheld in
    // the interface, and refused by the endpoint behind it.
    await expect(detailPage.linkButton).toBeDisabled();
    const headers = await authHeaders(page);
    const accounts = (await (await page.request.get('/api/users', { headers })).json()) as {
      email: string;
      userId: string;
    }[];
    const relinkAccountId = accounts.find((account) => account.email === relinkEmail)!.userId;
    const relink = await page.request.put(`/api/teachers/${teacherId}/account`, {
      headers,
      data: { accountId: relinkAccountId },
    });

    expect(relink.status()).toBe(400);
    // The refusal is the deactivation bar itself, not an unrelated rejection.
    expect(await relink.text()).toContain('cannot be linked to a deactivated teacher');

    // The record's history outlives the details it described.
    const activity = (await (
      await page.request.get(`/api/teachers/${teacherId}/banking/activity`, { headers: await authHeaders(page) })
    ).json()) as { eventType: string }[];

    expect(activity.map((entry) => entry.eventType)).toContain('teachers.banking_details.deleted');

    // And the teacher is still reachable from the roster.
    await teachersPage.gotoTeachers();
    await teachersPage.filterByStatus('deactivated');
    await expect(teachersPage.status(fullName)).toHaveText('Deactivated');
  });
});

test.describe('A teacher can only be deleted once deactivated', { tag: ['@7IT4'] }, () => {
  test('refuses deletion while active, offers no delete action, and succeeds after deactivation', async ({ page }) => {
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('lifecycle-delete');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(fullName);

    const detailPage = new TeacherDetailPage(page);
    const teacherId = await teacherIdBySurname(page, surname);

    // The action is absent while the teacher is active — not disabled.
    await expect(detailPage.deactivateButton).toBeVisible();
    await expect(detailPage.deleteButton).toBeHidden();

    // Absence from the interface is not the boundary; the endpoint refuses too.
    const refused = await page.request.delete(`/api/teachers/${teacherId}`, { headers: await authHeaders(page) });
    expect(refused.status()).toBe(400);

    const stillThere = await page.request.get(`/api/teachers/${teacherId}`, { headers: await authHeaders(page) });
    expect(stillThere.status()).toBe(200);

    await detailPage.deactivate();
    await expect(detailPage.deleteButton).toBeVisible();

    await detailPage.deleteTeacher();

    await expect(page).toHaveURL(/#\/teachers$/);
    await expect(teachersPage.row(fullName)).toHaveCount(0);

    const gone = await page.request.get(`/api/teachers/${teacherId}`, { headers: await authHeaders(page) });
    expect(gone.status()).toBe(404);
  });
});

test.describe('A Coordinator maintains the teacher, not their lifecycle or money', { tag: ['@7IT11'] }, () => {
  test('can edit the profile but is offered and refused every lifecycle and banking action', async ({ page }) => {
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('lifecycle-coordinator');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(fullName);

    const adminDetailPage = new TeacherDetailPage(page);
    await adminDetailPage.captureBankingDetails(BANKING);
    const teacherId = await teacherIdBySurname(page, surname);

    const coordinatorEmail = uniqueTestEmail('lifecycle-coordinator');
    await createRegisteredUser(page, coordinatorEmail, PASSWORD, ['Coordinator']);
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(coordinatorEmail, PASSWORD);
    await expect(page).toHaveURL(landingUrl('Coordinator'));

    const coordinatorTeachers = new TeachersPage(page);
    await coordinatorTeachers.gotoTeachers();
    await coordinatorTeachers.openTeacher(fullName);

    const detailPage = new TeacherDetailPage(page);

    // The profile is theirs to maintain.
    const updatedFirstName = `${firstName}-Updated`;
    await detailPage.editNames(updatedFirstName, surname);
    await expect(detailPage.firstName()).toHaveText(updatedFirstName);

    // The lifecycle is not.
    await expect(detailPage.deactivateButton).toBeHidden();
    await expect(detailPage.reactivateButton).toBeHidden();
    await expect(detailPage.deleteButton).toBeHidden();

    // Neither is the money: masked read only, with no way to change or reveal it.
    await expect(detailPage.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);
    await expect(detailPage.bankingEditButton).toBeHidden();
    await expect(detailPage.bankingDeleteButton).toBeHidden();
    await expect(detailPage.bankingRevealButton).toBeHidden();
    await expect(detailPage.bankingAddButton).toBeHidden();

    // Withheld controls are presentation; the endpoints are the boundary.
    const headers = await authHeaders(page);
    const deactivate = await page.request.patch(`/api/teachers/${teacherId}/deactivate`, { headers });
    const reactivate = await page.request.patch(`/api/teachers/${teacherId}/reactivate`, { headers });
    const remove = await page.request.delete(`/api/teachers/${teacherId}`, { headers });
    const createBanking = await page.request.post(`/api/teachers/${teacherId}/banking`, {
      headers,
      data: { bank: 'Absa', accountType: 'Savings', branchCode: '632005', accountNumber: '9999888877' },
    });
    const updateBanking = await page.request.put(`/api/teachers/${teacherId}/banking`, {
      headers,
      data: { bank: 'Absa', accountType: 'Savings', branchCode: '632005' },
    });
    const deleteBanking = await page.request.delete(`/api/teachers/${teacherId}/banking`, { headers });
    const reveal = await page.request.post(`/api/teachers/${teacherId}/banking/reveal`, { headers });

    expect(deactivate.status()).toBe(403);
    expect(reactivate.status()).toBe(403);
    expect(remove.status()).toBe(403);
    expect(createBanking.status()).toBe(403);
    expect(updateBanking.status()).toBe(403);
    expect(deleteBanking.status()).toBe(403);
    expect(reveal.status()).toBe(403);
  });
});
