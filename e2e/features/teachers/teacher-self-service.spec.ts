import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToTeachersPage } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { MyDetailsPage } from '../../pages/teachers/MyDetailsPage';
import { landingUrl } from '../../fixtures/navigation';

const PASSWORD = 'TeacherSelfServicePass123!';
const ACCOUNT_NUMBER = '1122334455';
const LAST4 = '4455';

const BANKING = {
  bank: 'Nedbank',
  accountType: 'Savings',
  branchCode: '198765',
  accountNumber: ACCOUNT_NUMBER,
};

function uniqueName(label: string): { firstName: string; surname: string } {
  return {
    firstName: `E2E-${label}`,
    surname: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

/**
 * Creates a teacher as a Coordinator, links it to a freshly registered
 * Teacher-role account, and leaves the browser signed in as that teacher.
 */
async function signInAsLinkedTeacher(
  page: import('@playwright/test').Page,
  label: string,
): Promise<{ email: string; firstName: string; surname: string }> {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

  const teachersPage = await goToTeachersPage(page);
  const { firstName, surname } = uniqueName(label);
  await teachersPage.createTeacher({ firstName, surname, linkedAccountEmail: email });
  await expect(teachersPage.row(`${firstName} ${surname}`)).toBeVisible();

  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, PASSWORD);
  await expect(page).toHaveURL(landingUrl('Teacher'));

  return { email, firstName, surname };
}

test.describe('A linked teacher maintains their own record', { tag: ['@7IT12'] }, () => {
  test('edits their own profile and manages their own banking details from the account menu', async ({ page }) => {
    const { email, surname } = await signInAsLinkedTeacher(page, 'self-service');

    const myDetails = new MyDetailsPage(page);
    await myDetails.open();
    await expect(myDetails.modal).toContainText(email);

    // The profile names are theirs to correct.
    await myDetails.editNames('Renamed', surname);
    await expect(myDetails.firstName()).toHaveText('Renamed');

    // The classification is shown locked, with the reason it is not theirs to change.
    await expect(myDetails.classification).toContainText(
      'Only a Coordinator or BankingCoordinator can change this classification',
    );
    await expect(myDetails.classification.locator('input')).toHaveCount(0);

    // Banking details: capture, reveal, see the activity, and delete.
    await expect(myDetails.bankingEmptyState).toBeVisible();
    await myDetails.captureBankingDetails(BANKING);
    await expect(myDetails.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);

    await myDetails.bankingRevealButton.click();
    await expect(myDetails.bankingAccountNumber).toHaveText(ACCOUNT_NUMBER);

    await myDetails.bankingActivityButton.click();
    await expect(myDetails.bankingActivityModal).toContainText(email);
    await myDetails.bankingActivityModal.locator('#closeBtn').click();

    await myDetails.deleteBankingDetails();
    await expect(myDetails.bankingEmptyState).toBeVisible();
  });

  test('cannot change their own classification or account link, or reach another teacher', async ({ page }) => {
    const otherTeachers = await goToTeachersPage(page);
    const other = uniqueName('self-service-other');
    await otherTeachers.createTeacher({ firstName: other.firstName, surname: other.surname });
    await expect(otherTeachers.row(`${other.firstName} ${other.surname}`)).toBeVisible();

    const coordinatorToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
    const roster = await (
      await page.request.get('/api/teachers', { headers: { Authorization: `Bearer ${coordinatorToken}` } })
    ).json();
    const otherTeacherId = roster.find(
      (candidate: { surname: string; teacherId: string }) => candidate.surname === other.surname,
    ).teacherId;

    await signInAsLinkedTeacher(page, 'self-service-limits');

    const headers = {
      Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pm_access_token'))}`,
    };
    const own = await (await page.request.get('/api/teachers/me', { headers })).json();

    const classification = await page.request.put(`/api/teachers/${own.teacherId}/classification`, {
      headers,
      data: { isPrivate: true },
    });
    const unlink = await page.request.delete(`/api/teachers/${own.teacherId}/account`, { headers });
    const otherRecord = await page.request.get(`/api/teachers/${otherTeacherId}`, { headers });
    const otherReveal = await page.request.post(`/api/teachers/${otherTeacherId}/banking/reveal`, { headers });

    expect(classification.status()).toBe(403);
    expect(unlink.status()).toBe(403);
    expect(otherRecord.status()).toBe(403);
    expect(otherReveal.status()).toBe(403);

    // Nothing the teacher tried has changed anything about their own record.
    const unchanged = await (await page.request.get('/api/teachers/me', { headers })).json();
    expect(unchanged.isPrivate).toBe(false);
    expect(unchanged.linkedAccountId).toBe(own.linkedAccountId);
  });

  test('offers no own-record entry point to a signed-in user linked to no teacher', async ({ page }) => {
    const email = uniqueTestEmail('self-service-unlinked');
    await createRegisteredUser(page, email, PASSWORD, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, PASSWORD);
    await expect(page).toHaveURL(landingUrl('Teacher'));

    const myDetails = new MyDetailsPage(page);
    await expect(myDetails.accountChip).toBeVisible();
    await myDetails.accountChip.click();
    await expect(myDetails.myDetailsItem).toBeHidden();

    const headers = {
      Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pm_access_token'))}`,
    };
    const own = await page.request.get('/api/teachers/me', { headers });

    expect(own.status()).toBe(404);
  });
});
