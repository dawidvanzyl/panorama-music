import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  closePrintDialog,
  openStudents,
  printCallCount,
  readExtendedView,
  seedGuardian,
  seedListedActivity,
  seedStudent,
  signInToSeed,
  stubPrint,
  trackApiRequests,
  uniqueToken,
} from '../../fixtures/studentPrint';
import { assignActivity } from '../../fixtures/extraCurriculars';
import {
  ownBackgroundIsLight,
  ownBackgroundIsWhite,
  ownTextIsMuted,
  ownTextIsNearBlack,
  switchToPrintMedia,
} from '../../fixtures/printMedia';
import { StudentPrintRecordPage } from '../../pages/students/StudentPrintRecordPage';

async function seedTwoStudents(page: Page) {
  const token = uniqueToken();
  const target = await signInToSeed(page);
  const firstId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
  const secondId = await seedStudent(page, target, { firstName: 'Ben', lastName: token });
  const studentsPage = await openStudents(page, token);
  return { token, firstId, secondId, studentsPage };
}

test.describe('Students — Print invokes the browser print for one student', { tag: ['@340IT12'] }, () => {
  test('S1 one print, of that student, never shown on screen', async ({ page }) => {
    const { token, firstId, studentsPage } = await seedTwoStudents(page);
    const record = new StudentPrintRecordPage(page);
    const api = trackApiRequests(page);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, firstId);
    await expect(record.record).toBeHidden();

    await stubPrint(page);
    const mark = api.mark();
    await studentsPage.printButtonOf(firstId).click();

    expect(await printCallCount(page)).toBe(1);
    await expect(record.record).toBeHidden();
    await expect(studentsPage.listedStudentNames()).toHaveCount(2);
    await expect(page.locator('pm-students-page h1')).toBeVisible();
    await expect(studentsPage.printButtonOf(firstId)).toBeVisible();

    await switchToPrintMedia(page);

    await expect(record.record).toBeVisible();
    await expect(record.studentName).toHaveCount(1);
    await expect(record.studentName).toHaveText(`Ava ${token}`);
    await expect(page.locator('pm-students-table')).toBeHidden();
    await expect(page.locator('#filterBar')).toBeHidden();
    await expect(page.locator('pm-students-page h1')).toBeHidden();
    await expect(page.locator('pm-sidebar')).toBeHidden();
    expect(api.since(mark)).toEqual([]);
  });

  test('S2 printing a second student prints only that one', async ({ page }) => {
    const { token, firstId, secondId, studentsPage } = await seedTwoStudents(page);
    const record = new StudentPrintRecordPage(page);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, firstId);
    await studentsPage.expandUntilPrintOffered(`Ben ${token}`, secondId);

    await stubPrint(page);
    await studentsPage.printButtonOf(firstId).click();
    await closePrintDialog(page);
    await studentsPage.printButtonOf(secondId).click();
    await switchToPrintMedia(page);

    expect(await printCallCount(page)).toBe(2);
    await expect(record.studentName).toHaveCount(1);
    await expect(record.studentName).toHaveText(`Ben ${token}`);
  });

  test('S3 what is printed is the loaded extended view', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    const guardian = await seedGuardian(page, studentId, { firstName: 'Nomsa', surname: token });
    const studentsPage = await openStudents(page, token);
    const record = new StudentPrintRecordPage(page);

    await studentsPage.expandUntilPrintOffered(`Thandi ${token}`, studentId);
    const extended = await readExtendedView(studentsPage);
    expect(extended.guardians).toHaveLength(1);
    expect(extended.courses).toHaveLength(1);

    await stubPrint(page);
    await studentsPage.printButtonOf(studentId).click();
    await switchToPrintMedia(page);

    const guardians = await record.printedGuardians();
    expect(guardians).toHaveLength(1);
    expect(guardians[0].heading).toBe(extended.guardians[0].heading);
    expect(guardians[0].heading.startsWith(guardian.fullName)).toBe(true);
    expect(await record.printedCourses()).toEqual(extended.courses);
    await expect(record.emptyState('guardians')).toHaveCount(0);
    await expect(record.emptyState('courses')).toHaveCount(0);
  });

  test('S4 the printed page is light', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    await seedGuardian(page, studentId, { firstName: 'Nomsa', surname: token });
    const studentsPage = await openStudents(page, token);
    const record = new StudentPrintRecordPage(page);

    await studentsPage.expandUntilPrintOffered(`Thandi ${token}`, studentId);
    await stubPrint(page);
    await studentsPage.printButtonOf(studentId).click();
    await switchToPrintMedia(page);

    await expect(record.record).toBeVisible();
    expect(await ownBackgroundIsWhite(page.locator('html'))).toBe(true);
    expect(await ownBackgroundIsWhite(page.locator('body'))).toBe(true);
    const sections = ['siblings', 'guardians', 'courses', 'extraCurriculars'] as const;
    expect(await ownBackgroundIsLight(record.record)).toBe(true);
    for (const name of sections) {
      expect(await ownBackgroundIsLight(record.section(name))).toBe(true);
      expect(await ownTextIsNearBlack(record.sectionHeading(name))).toBe(true);
    }
    expect(await ownTextIsNearBlack(record.studentName)).toBe(true);
    expect(await ownTextIsNearBlack(record.guardianEntries().first().locator('.print-record__entry-heading'))).toBe(
      true,
    );
    expect(await ownTextIsNearBlack(record.courseEntries().first().locator('.print-record__entry-heading'))).toBe(
      true,
    );
    expect(await ownTextIsMuted(record.record.locator('.print-record__label').first())).toBe(true);
  });
});

async function printFromFilteredRoster(page: Page) {
  const token = uniqueToken();
  const target = await signInToSeed(page);
  const firstId = await seedStudent(page, target, { firstName: 'Ava', lastName: token, grade: 'Grade4' });
  await seedStudent(page, target, { firstName: 'Ben', lastName: token, grade: 'Grade4' });
  await seedStudent(page, target, { firstName: 'Cora', lastName: token, grade: 'Grade5' });
  await seedGuardian(page, firstId, { firstName: 'Nomsa', surname: token });
  const activityId = await seedListedActivity(page, {
    description: `Choir ${token}`,
    phase: 'Junior',
    practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
  });
  await assignActivity(page, firstId, activityId);

  const studentsPage = await openStudents(page);
  await studentsPage.filterByName(token);
  await studentsPage.filterByGrade('Grade4');
  await expect(studentsPage.listedStudentNames()).toHaveCount(2);

  await studentsPage.expandUntilPrintOffered(`Ava ${token}`, firstId);
  const namesBefore = await studentsPage.listedStudentNames().allTextContents();
  const extendedBefore = await readExtendedView(studentsPage);

  const api = trackApiRequests(page);
  await stubPrint(page);
  const mark = api.mark();
  await studentsPage.printButtonOf(firstId).click();
  await closePrintDialog(page);

  return { token, firstId, studentsPage, namesBefore, extendedBefore, requests: () => api.since(mark) };
}

test.describe('Students — closing the print dialog leaves the screen as it was', { tag: ['@340IT13'] }, () => {
  test('S1 closing the dialog leaves the screen as it was', async ({ page }) => {
    const { token, firstId, studentsPage, namesBefore, extendedBefore, requests } = await printFromFilteredRoster(page);
    const record = new StudentPrintRecordPage(page);

    expect(namesBefore).toEqual([`Ava ${token}`, `Ben ${token}`]);
    await expect(page).toHaveURL(/#\/students$/);
    await expect(studentsPage.filterNameInput).toHaveValue(token);
    await expect(studentsPage.filterGradeSelect).toHaveValue('Grade4');
    expect(await studentsPage.listedStudentNames().allTextContents()).toEqual(namesBefore);
    await expect(studentsPage.printButtonOf(firstId)).toBeVisible();
    expect(await readExtendedView(studentsPage)).toEqual(extendedBefore);
    await expect(record.record).toBeHidden();
    expect(requests()).not.toContain('GET /api/students');
  });

  test('S2 the screen stays usable after printing', async ({ page }) => {
    const { token, firstId, studentsPage } = await printFromFilteredRoster(page);
    const record = new StudentPrintRecordPage(page);

    await studentsPage.toggleRowExpanded(`Ava ${token}`);
    await expect(studentsPage.anyPrintButton()).toHaveCount(0);
    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, firstId);
    await expect(studentsPage.visibleGuardiansSummary().locator('.summary__item')).toHaveCount(1);

    await studentsPage.filterGradeSelect.selectOption('');
    await expect(studentsPage.listedStudentNames()).toHaveCount(3);
    await expect(record.record).toBeHidden();
  });
});
