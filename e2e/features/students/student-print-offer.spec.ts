import type { Page, Route } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage, loginAsRoles } from '../../fixtures/testUsers';
import { landingUrl } from '../../fixtures/navigation';
import { seedWaitingListEntry } from '../../fixtures/waitingList';
import {
  boxOf,
  choosePrint,
  openStudents,
  seedGuardian,
  seedStudent,
  signInToSeed,
  uniqueToken,
  seedListedActivity,
} from '../../fixtures/studentPrint';
import { assignActivity } from '../../fixtures/extraCurriculars';
import { switchToPrintMedia } from '../../fixtures/printMedia';
import { StudentPrintRecordPage } from '../../pages/students/StudentPrintRecordPage';
import type { StudentsPage } from '../../pages/students/StudentsPage';

const READ_PATHS = ['siblings', 'guardians', 'courses', 'extra-curriculars'] as const;

function readUrl(studentId: string, path: (typeof READ_PATHS)[number]): string {
  return `**/api/students/${studentId}/${path}`;
}

/** Resolves once all four reads of one expansion have been answered. */
function waitForAllReads(page: Page, studentId: string): Promise<unknown> {
  return Promise.all(
    READ_PATHS.map((path) =>
      page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/students/${studentId}/${path}`) && response.request().method() === 'GET',
      ),
    ),
  );
}

async function serverError(route: Route): Promise<void> {
  await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"read failed"}' });
}

async function seedStudentWithGuardianAndCourse(page: Page) {
  const token = uniqueToken();
  const target = await signInToSeed(page);
  const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
  await seedGuardian(page, studentId, { firstName: 'Nomsa', surname: token });
  const studentsPage = await openStudents(page, token);
  return { token, studentId, studentsPage, name: `Thandi ${token}` };
}

async function expectGuardianShown(studentsPage: StudentsPage, token: string): Promise<void> {
  await expect(studentsPage.visibleGuardiansSummary().locator('.summary__item-heading')).toContainText(
    `Nomsa ${token}`,
  );
}

test.describe('Students — Print is offered in the expanded row', { tag: ['@340IT9'] }, () => {
  test('S1 Print sits at the top right of the expanded row', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const firstId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const secondId = await seedStudent(page, target, { firstName: 'Ben', lastName: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, firstId);

    await expect(studentsPage.anyPrintButton()).toHaveCount(1);
    await expect(studentsPage.printButtonOf(firstId)).toHaveCount(1);

    const area = await boxOf(studentsPage.summaryRowOf(firstId));
    const print = await boxOf(studentsPage.printButtonOf(firstId));
    const siblings = await boxOf(studentsPage.visibleSiblingsSummary());
    expect(print.y).toBeLessThan(siblings.y);
    expect(area.right - print.right).toBeLessThanOrEqual(24);
    expect(print.x).toBeGreaterThan(area.x + area.width / 2);

    await expect(studentsPage.printButtonOf(secondId)).toHaveCount(0);
  });

  test('S2 collapsing withdraws the offer', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const firstId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    await seedStudent(page, target, { firstName: 'Ben', lastName: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, firstId);
    await studentsPage.toggleRowExpanded(`Ava ${token}`);

    await expect(studentsPage.anyPrintButton()).toHaveCount(0);
  });

  test('S3 each expanded row offers its own Print', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const firstId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const secondId = await seedStudent(page, target, { firstName: 'Ben', lastName: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, firstId);
    await studentsPage.expandUntilPrintOffered(`Ben ${token}`, secondId);

    await expect(studentsPage.anyPrintButton()).toHaveCount(2);
    await expect(studentsPage.printButtonOf(firstId)).toHaveCount(1);
    await expect(studentsPage.printButtonOf(secondId)).toHaveCount(1);
  });

  test('S4 not offered while the row sections are loading', async ({ page }) => {
    const { token, studentId, studentsPage, name } = await seedStudentWithGuardianAndCourse(page);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(readUrl(studentId, 'guardians'), async (route) => {
      await gate;
      await route.continue();
    });

    await studentsPage.toggleRowExpanded(name);
    await expect(studentsPage.summaryRowOf(studentId)).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);

    release();

    await expectGuardianShown(studentsPage, token);
    await expect(studentsPage.printButtonOf(studentId)).toHaveCount(1);
  });

  test('S5 not offered after a section read fails', async ({ page }) => {
    const { studentId, studentsPage, name } = await seedStudentWithGuardianAndCourse(page);
    await page.route(readUrl(studentId, 'courses'), serverError);

    const reads = waitForAllReads(page, studentId);
    await studentsPage.toggleRowExpanded(name);
    await reads;

    await expect(studentsPage.visibleGuardiansSummary().locator('.summary__empty')).toBeVisible();
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);
    await page.waitForTimeout(2000);
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);
  });

  test('S6 offered again once a later expansion reads succeed', async ({ page }) => {
    const { token, studentId, studentsPage, name } = await seedStudentWithGuardianAndCourse(page);
    await page.route(readUrl(studentId, 'courses'), serverError);
    const reads = waitForAllReads(page, studentId);
    await studentsPage.toggleRowExpanded(name);
    await reads;
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);

    await page.unroute(readUrl(studentId, 'courses'));
    await studentsPage.toggleRowExpanded(name);
    await studentsPage.toggleRowExpanded(name);

    await expect(studentsPage.visibleCoursesSummary().locator('.summary__item')).toHaveCount(1);
    await expectGuardianShown(studentsPage, token);
    await expect(studentsPage.printButtonOf(studentId)).toHaveCount(1);
    await expect(studentsPage.anyPrintButton()).toHaveCount(1);
  });

  test('S7 a re-expansion that fails withdraws a previously offered Print', async ({ page }) => {
    const { studentId, studentsPage, name } = await seedStudentWithGuardianAndCourse(page);
    await studentsPage.expandUntilPrintOffered(name, studentId);
    await studentsPage.toggleRowExpanded(name);

    await page.route(readUrl(studentId, 'guardians'), serverError);
    const reads = waitForAllReads(page, studentId);
    await studentsPage.toggleRowExpanded(name);
    await reads;

    await expect(studentsPage.summaryRowOf(studentId)).toBeVisible();
    await expect(studentsPage.visibleGuardiansSummary().locator('.summary__empty')).toBeVisible();
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);
  });

  test('S8 a superseded read never changes the row', async ({ page }) => {
    const { token, studentId, studentsPage, name } = await seedStudentWithGuardianAndCourse(page);

    let release!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    await page.route(readUrl(studentId, 'guardians'), async (route) => {
      requests += 1;
      if (requests === 1) {
        await firstGate;
        await serverError(route);
        return;
      }
      await route.continue();
    });

    await studentsPage.toggleRowExpanded(name);
    await studentsPage.toggleRowExpanded(name);
    await studentsPage.toggleRowExpanded(name);
    await expectGuardianShown(studentsPage, token);
    await expect(studentsPage.printButtonOf(studentId)).toHaveCount(1);

    release();
    await page.waitForTimeout(2000);

    await expectGuardianShown(studentsPage, token);
    await expect(studentsPage.visibleCoursesSummary().locator('.summary__item')).toHaveCount(1);
    await expect(studentsPage.anyPrintButton()).toHaveCount(1);

    await choosePrint(page, studentsPage, studentId);
    await switchToPrintMedia(page);
    const record = new StudentPrintRecordPage(page);
    await expect(record.guardianEntries()).toHaveCount(1);
    await expect(record.emptyState('guardians')).toHaveCount(0);
  });
});

test.describe('Students — Print is not offered in the wizard or on the waiting list', { tag: ['@340IT10'] }, () => {
  test('S1 the create wizard offers no Print', async ({ page }) => {
    await signInToSeed(page);
    const studentsPage = await openStudents(page);
    const token = uniqueToken();

    await studentsPage.startCreatingStudent({
      firstName: 'Ava',
      lastName: token,
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });
    const wizardPrint = studentsPage.wizardModal.getByRole('button', { name: 'Print', exact: true });
    await expect(wizardPrint).toHaveCount(0);

    for (let step = 0; step < 4; step++) {
      await studentsPage.goToNextStep();
      await expect(wizardPrint).toHaveCount(0);
    }
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);
  });

  test('S2 the edit wizard offers no Print, even with the row expanded beneath it', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    await seedGuardian(page, studentId, { firstName: 'Nomsa', surname: token });
    const activityId = await seedListedActivity(page, {
      description: `Choir ${token}`,
      phase: 'Junior',
      practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
    });
    await assignActivity(page, studentId, activityId);
    const studentsPage = await openStudents(page, token);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, studentId);
    await studentsPage.row(`Ava ${token}`).locator('.students-table__btn--edit').click();

    const wizardPrint = studentsPage.wizardModal.getByRole('button', { name: 'Print', exact: true });
    for (const tab of ['#tabStudent', '#tabSiblings', '#tabGuardians', '#tabCourses', '#tabExtraCurriculars']) {
      await studentsPage.wizardModal.locator(tab).click();
      await expect(studentsPage.wizardModal.locator(tab)).toHaveAttribute('aria-selected', 'true');
      await expect(wizardPrint).toHaveCount(0);
    }
  });

  test('S3 the waiting list offers no Print', async ({ page }) => {
    const token = uniqueToken();
    const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool', lastName: token });
    await page.reload();

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
    for (const label of ['During School', 'After School'] as const) {
      const header = waitingListPage.groupHeader(label);
      if ((await header.getAttribute('data-expanded')) === 'false') {
        await waitingListPage.toggleGroup(label);
      }
    }

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print', exact: true })).toHaveCount(0);
  });
});

test.describe('Students — a user who is not a Teacher is refused the screen', { tag: ['@340IT11'] }, () => {
  test('S1 a Coordinator is refused Students', async ({ page }) => {
    await loginAsRoles(page, ['Coordinator']);

    await page.goto('/#/students');

    await expect(page).toHaveURL(landingUrl('Coordinator'));
    await expect(page.locator('pm-students-page')).toHaveCount(0);
    await expect(page.locator('pm-students-table')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Print', exact: true })).toHaveCount(0);
  });

  test('S2 an Admin is refused Students', async ({ page }) => {
    await loginAsRoles(page, ['Admin']);

    await page.goto('/#/students');

    await expect(page).toHaveURL(landingUrl('Admin'));
    await expect(page.locator('pm-students-page')).toHaveCount(0);
    await expect(page.locator('pm-students-table')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Print', exact: true })).toHaveCount(0);
  });
});
