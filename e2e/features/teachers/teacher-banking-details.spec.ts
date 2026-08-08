import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToTeachersPage } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { TeachersPage } from '../../pages/teachers/TeachersPage';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

const PASSWORD = 'TeacherBankingPass123!';
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

async function teacherIdByFirstName(
  page: import('@playwright/test').Page,
  firstName: string,
): Promise<string> {
  const response = await page.request.get('/api/teachers', { headers: await authHeaders(page) });
  const teachers = (await response.json()) as { firstName: string; teacherId: string }[];

  return teachers.find((teacher) => teacher.firstName === firstName)!.teacherId;
}

test.describe('Banking details are captured on the teacher record', { tag: ['@7IT13'] }, () => {
  test('captures one set per teacher, edits it, and refuses a second', async ({ page }) => {
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('banking-capture');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(fullName);

    const detailPage = new TeacherDetailPage(page);
    await expect(detailPage.bankingEmptyState).toBeVisible();
    await detailPage.captureBankingDetails(BANKING);

    await expect(detailPage.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);

    // An edit that leaves the account number alone keeps the stored one.
    await detailPage.bankingEditButton.click();
    await detailPage.saveBankingDetails({ bank: 'Capitec', accountType: 'ChequeCurrent', branchCode: '470010' });
    await expect(detailPage.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);
    await expect(detailPage.bankingSection).toContainText('Capitec');

    // A second capture is refused — the teacher has at most one set.
    const teacherId = await teacherIdByFirstName(page, firstName);
    const secondCapture = await page.request.post(`/api/teachers/${teacherId}/banking`, {
      headers: await authHeaders(page),
      data: { bank: 'Absa', accountType: 'Savings', branchCode: '632005', accountNumber: '9999888877' },
    });

    expect(secondCapture.status()).toBe(400);
  });
});

test.describe('The stored account number is protected, never plaintext', { tag: ['@7IT14'] }, () => {
  test('no read but the reveal action returns the number, and reveal returns it in full', async ({ page }) => {
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('banking-protected');
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(`${firstName} ${surname}`);

    const detailPage = new TeacherDetailPage(page);
    await detailPage.captureBankingDetails(BANKING);

    const teacherId = await teacherIdByFirstName(page, firstName);
    const headers = await authHeaders(page);

    const record = await (await page.request.get(`/api/teachers/${teacherId}`, { headers })).text();
    const roster = await (await page.request.get('/api/teachers', { headers })).text();
    const revealResponse = await page.request.post(`/api/teachers/${teacherId}/banking/reveal`, { headers });
    const revealed = (await revealResponse.json()) as { accountNumber: string };

    // The number is absent from every ordinary read and present only here,
    // which is what a protected column means from the outside.
    expect(record).not.toContain(ACCOUNT_NUMBER);
    expect(roster).not.toContain(ACCOUNT_NUMBER);
    expect(record).toContain(LAST4);
    expect(revealed.accountNumber).toBe(ACCOUNT_NUMBER);
  });
});

test.describe('The account number is masked and revealed only deliberately', { tag: ['@7IT15'] }, () => {
  test('an Admin can reveal it, a Coordinator sees only the mask and is refused', async ({ page }) => {
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('banking-reveal');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(fullName);

    const detailPage = new TeacherDetailPage(page);
    await detailPage.captureBankingDetails(BANKING);

    await expect(detailPage.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);
    await detailPage.bankingRevealButton.click();
    await expect(detailPage.bankingAccountNumber).toHaveText(ACCOUNT_NUMBER);
    await detailPage.bankingRevealButton.click();
    await expect(detailPage.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);

    // The roster shows the mask and nothing more.
    await teachersPage.gotoTeachers();
    await expect(teachersPage.bankingDetails(fullName)).toHaveText(`•••• •••• ${LAST4}`);

    const teacherId = await teacherIdByFirstName(page, firstName);

    const coordinatorEmail = uniqueTestEmail('banking-coordinator');
    await createRegisteredUser(page, coordinatorEmail, PASSWORD, ['Coordinator']);
    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(coordinatorEmail, PASSWORD);

    const coordinatorTeachers = new TeachersPage(page);
    await coordinatorTeachers.gotoTeachers();
    await coordinatorTeachers.openTeacher(fullName);

    await expect(detailPage.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);
    await expect(detailPage.bankingRevealButton).toBeHidden();
    await expect(detailPage.bankingEditButton).toBeHidden();
    await expect(detailPage.bankingRevealNote).toContainText('Your role can see the masked value only');

    // Hiding the controls is presentation; the endpoint is the boundary.
    const reveal = await page.request.post(`/api/teachers/${teacherId}/banking/reveal`, {
      headers: await authHeaders(page),
    });
    expect(reveal.status()).toBe(403);
  });
});

test.describe('Every banking operation is audited', { tag: ['@7IT16'] }, () => {
  test('the activity view records the create, edit, reveal and delete with their actor', async ({ page }) => {
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('banking-audit');
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(`${firstName} ${surname}`);

    const detailPage = new TeacherDetailPage(page);
    await detailPage.captureBankingDetails(BANKING);
    await detailPage.bankingEditButton.click();
    await detailPage.saveBankingDetails({ bank: 'Nedbank', accountType: 'Savings', branchCode: '198765' });
    await detailPage.bankingRevealButton.click();
    await expect(detailPage.bankingAccountNumber).toHaveText(ACCOUNT_NUMBER);
    await detailPage.deleteBankingDetails();
    await expect(detailPage.bankingEmptyState).toBeVisible();

    // The history outlives the record it describes — the activity is still
    // there after the details are deleted.
    const teacherId = await teacherIdByFirstName(page, firstName);
    const activity = (await (
      await page.request.get(`/api/teachers/${teacherId}/banking/activity`, { headers: await authHeaders(page) })
    ).json()) as { eventType: string; actorEmail: string | null }[];

    const eventTypes = activity.map((entry) => entry.eventType);

    expect(eventTypes).toContain('teachers.banking_details.captured');
    expect(eventTypes).toContain('teachers.banking_details.amended');
    expect(eventTypes).toContain('teachers.banking_details.revealed');
    expect(eventTypes).toContain('teachers.banking_details.deleted');
    expect(activity.every((entry) => entry.actorEmail !== null)).toBe(true);
  });
});

test.describe('Audit entries carry at most the last four digits', { tag: ['@7IT17'] }, () => {
  test('no activity entry, audit row or rendered activity view holds the account number', async ({ page }) => {
    const teachersPage = await goToTeachersPage(page);
    const { firstName, surname } = uniqueName('banking-audit-content');
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(`${firstName} ${surname}`);

    const detailPage = new TeacherDetailPage(page);
    await detailPage.captureBankingDetails(BANKING);
    await detailPage.bankingRevealButton.click();
    await expect(detailPage.bankingAccountNumber).toHaveText(ACCOUNT_NUMBER);

    const teacherId = await teacherIdByFirstName(page, firstName);
    const headers = await authHeaders(page);

    const activityBody = await (
      await page.request.get(`/api/teachers/${teacherId}/banking/activity`, { headers })
    ).text();
    const auditBody = await (
      await page.request.get('/api/audit?eventType=teachers.banking_details.revealed&page=1&pageSize=50', { headers })
    ).text();

    expect(activityBody).not.toContain(ACCOUNT_NUMBER);
    expect(activityBody).toContain(LAST4);
    expect(auditBody).not.toContain(ACCOUNT_NUMBER);

    // And the rendered view shows no more than the payload does.
    await detailPage.bankingActivityButton.click();
    await expect(detailPage.bankingActivityRows.first()).toBeVisible();
    await expect(detailPage.bankingActivityModal).not.toContainText(ACCOUNT_NUMBER);
    await expect(detailPage.bankingActivityModal).toContainText(LAST4);
  });
});
