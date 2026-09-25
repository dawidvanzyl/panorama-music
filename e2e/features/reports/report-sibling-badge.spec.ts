import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToReportsPage, loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import { fetchLessonStructureId, seedCourseOfType, seedWaitingListEntry } from '../../fixtures/waitingList';
import { linkSiblings } from '../../fixtures/siblings';
import { seedReportStudent, runReportViaApi, saveReportViaApi } from '../../fixtures/reports';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';
import { ReportsPage } from '../../pages/reports/ReportsPage';

/**
 * Every scenario mints its own token and uses it as its seeded students'
 * surname (or part of it), which is what keeps every scenario below
 * parallel-safe against the shared QA database.
 */
function uniqueToken(prefix = 'Sib'): string {
  return `${prefix}${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

/**
 * Signs in and lands on the Reports list without opening the builder yet.
 * The builder reads its datasource options when it opens, with no cache, so
 * every scenario below seeds its students and links first and opens the
 * builder only afterwards.
 */
async function loginForReports(page: Page): Promise<ReportsPage> {
  return goToReportsPage(page, ['Teacher', 'Coordinator']);
}

async function openBuilderFrom(reportsPage: ReportsPage, page: Page): Promise<ReportBuilderPage> {
  await reportsPage.createReport();
  const builder = new ReportBuilderPage(page);
  await expect(builder.filtersEmptyMessage).toBeVisible();
  return builder;
}

async function runAndGetResults(page: Page, builder: ReportBuilderPage): Promise<ReportResultsPage> {
  await builder.runReport();
  const results = new ReportResultsPage(page);
  await expect(page).toHaveURL(/#\/reports\/results$/);
  await expect(results.subline).toBeVisible();
  return results;
}

async function addNameFilter(builder: ReportBuilderPage, index: number, token: string): Promise<void> {
  await builder.addFilter();
  await builder.chooseAttribute(index, 'Student · Name');
  await builder.typeTextValue(index, token);
}

async function seedInstrumentCourse(page: Page): Promise<string> {
  const lessonStructureId = await fetchLessonStructureId(page, {
    occurrenceType: 'DuringSchool',
    lessonType: 'Individual',
    durationType: 'HalfHour',
  });
  return seedCourseOfType(page, lessonStructureId, 'Instrument');
}

// ---------------------------------------------------------------------------
// 11IT37 — a present sibling pair shows an age-ordered badge
// ---------------------------------------------------------------------------

test.describe('Report results — a present sibling pair shows an age-ordered badge', { tag: ['@11IT37'] }, () => {
  test('S1 — the elder is 1.1 and the younger 1.2, even when the younger comes first in the report', async ({
    page,
  }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const amyId = await seedReportStudent(page, target, {
      firstName: 'Amy',
      lastName: token,
      dateOfBirth: '2016-04-10',
    });
    const benId = await seedReportStudent(page, target, {
      firstName: 'Ben',
      lastName: token,
      dateOfBirth: '2013-02-01',
    });
    await linkSiblings(page, amyId, benId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(2);
    const names = await results.allSections().allTextContents();
    expect(names[0]).toContain(`Amy ${token}`);
    expect(names[1]).toContain(`Ben ${token}`);
    await expect(results.siblingBadge(`Ben ${token}`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Amy ${token}`)).toHaveText('1.2');
  });

  test('S2 — the badge is on the first row only and adds no column', async ({ page }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);
    const instrumentCourseId = await seedInstrumentCourse(page);

    const calId = await seedReportStudent(page, target, {
      firstName: 'Cal',
      lastName: token,
      dateOfBirth: '2012-05-05',
      enrolments: [
        { courseId: target.courseId, teacherId: target.teacherId },
        { courseId: instrumentCourseId, teacherId: target.teacherId, instrumentType: 'Piano', stepType: 'Step1A' },
      ],
    });
    const deeId = await seedReportStudent(page, target, {
      firstName: 'Dee',
      lastName: token,
      dateOfBirth: '2015-05-05',
    });
    await linkSiblings(page, calId, deeId);

    const builder = await openBuilderFrom(reportsPage, page);
    await builder.tickColumnByKey('course.courseType');
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.headers()).toHaveText(['Student', 'Course Type']);

    const calRows = results.sectionRows(`Cal ${token}`);
    await expect(calRows).toHaveCount(2);
    const calRow1 = results.cells(calRows.nth(0));
    const calRow2 = results.cells(calRows.nth(1));
    await expect(calRow1).toHaveCount(2);
    await expect(calRow2).toHaveCount(2);
    await expect(results.siblingBadge(`Cal ${token}`)).toHaveText('1.1');
    await expect(calRow2.locator('[data-testid="sibling-badge"]')).toHaveCount(0);

    await expect(results.siblingBadge(`Dee ${token}`)).toHaveText('1.2');
  });

  test('S3 — each run recomputes badges from live data', async ({ page }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const eliId = await seedReportStudent(page, target, {
      firstName: 'Eli',
      lastName: token,
      dateOfBirth: '2014-01-01',
    });
    const fayId = await seedReportStudent(page, target, {
      firstName: 'Fay',
      lastName: token,
      dateOfBirth: '2016-01-01',
    });

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.siblingBadge(`Eli ${token}`)).toHaveCount(0);
    await expect(results.siblingBadge(`Fay ${token}`)).toHaveCount(0);

    await linkSiblings(page, eliId, fayId);
    await results.runAgain();

    await expect(results.siblingBadge(`Eli ${token}`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Fay ${token}`)).toHaveText('1.2');
  });

  test('S4 — a saved report run from the Reports list shows the badges', async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);

    const gusId = await seedReportStudent(page, target, {
      firstName: 'Gus',
      lastName: token,
      dateOfBirth: '2016-03-03',
    });
    const halId = await seedReportStudent(page, target, {
      firstName: 'Hal',
      lastName: token,
      dateOfBirth: '2013-03-03',
    });
    await linkSiblings(page, gusId, halId);

    const saved = await saveReportViaApi(page, {
      name: `Siblings ${token}`,
      definition: {
        filters: [{ field: 'student.name', operator: 'contains', values: [token] }],
        columns: ['student.name'],
      },
    });
    expect(saved.status).toBe(201);

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();
    const row = reportsPage.rowByName(`Siblings ${token}`);
    await reportsPage.run(row);

    const results = new ReportResultsPage(page);
    await expect(page).toHaveURL(/#\/reports\/results$/);
    await expect(results.siblingBadge(`Hal ${token}`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Gus ${token}`)).toHaveText('1.2');
  });

  test('S5 — the run API reports the same badge for each section', async ({ page }) => {
    const token = uniqueToken();
    await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const ivyId = await seedReportStudent(page, target, {
      firstName: 'Ivy',
      lastName: token,
      dateOfBirth: '2015-01-01',
    });
    const jonId = await seedReportStudent(page, target, {
      firstName: 'Jon',
      lastName: token,
      dateOfBirth: '2012-01-01',
    });
    await linkSiblings(page, ivyId, jonId);
    await seedReportStudent(page, target, { firstName: 'Kit', lastName: token });

    const { status, body } = await runReportViaApi(page, {
      filters: [{ field: 'student.name', operator: 'contains', values: [token] }],
      columns: ['student.name'],
    });

    expect(status).toBe(200);
    expect(body.sections).toHaveLength(3);
    expect(body.columns).toHaveLength(1);
    expect(body.columns![0].key).toBe('student.name');

    const jonSection = body.sections!.find((s) => s.studentId === jonId)!;
    const ivySection = body.sections!.find((s) => s.studentId === ivyId)!;
    const kitSection = body.sections!.find((s) => s.rows[0][0] === `Kit ${token}`)!;
    expect(jonSection.siblingBadge).toBe('1.1');
    expect(ivySection.siblingBadge).toBe('1.2');
    expect(kitSection.siblingBadge).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 11IT38 — a student whose whole sibling group is absent stays unmarked
// ---------------------------------------------------------------------------

test.describe('Report results — a student whose whole sibling group is absent stays unmarked', { tag: ['@11IT38'] }, () => {
  test('S1 — a student whose only sibling is filtered out is unmarked, while a present pair is marked', async ({
    page,
  }) => {
    const token = uniqueToken();
    const otherToken = uniqueToken('Sib2');
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const annId = await seedReportStudent(page, target, { firstName: 'Ann', lastName: token });
    const boId = await seedReportStudent(page, target, { firstName: 'Bo', lastName: otherToken });
    await linkSiblings(page, annId, boId);

    const cyId = await seedReportStudent(page, target, {
      firstName: 'Cy',
      lastName: token,
      dateOfBirth: '2012-06-06',
    });
    const diId = await seedReportStudent(page, target, {
      firstName: 'Di',
      lastName: token,
      dateOfBirth: '2015-06-06',
    });
    await linkSiblings(page, cyId, diId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(3);
    await expect(results.siblingBadge(`Ann ${token}`)).toHaveCount(0);
    await expect(results.siblingBadge(`Cy ${token}`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Di ${token}`)).toHaveText('1.2');
    await expect(results.sectionFor(`Bo ${otherToken}`)).toHaveCount(0);
  });

  test('S2 — a student whose only sibling is waiting-list-only, and so can never be in a report, is unmarked', async ({
    page,
  }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const eveId = await seedReportStudent(page, target, { firstName: 'Eve', lastName: token });
    const waiting = await seedWaitingListEntry(page, { occurrenceType: 'AfterSchool', lastName: token });
    await linkSiblings(page, eveId, waiting.studentId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(1);
    await expect(results.siblingBadge(`Eve ${token}`)).toHaveCount(0);
    await expect(results.sectionFor(`Waiting ${token}`)).toHaveCount(0);
  });

  test('S3 — a student with no sibling links at all is unmarked', async ({ page }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    await seedReportStudent(page, target, { firstName: 'Fin', lastName: token });
    const gilId = await seedReportStudent(page, target, { firstName: 'Gil', lastName: token });
    const hopeId = await seedReportStudent(page, target, { firstName: 'Hope', lastName: token });
    await linkSiblings(page, gilId, hopeId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.siblingBadge(`Fin ${token}`)).toHaveCount(0);
    const gilBadge = await results.siblingBadge(`Gil ${token}`).textContent();
    const hopeBadge = await results.siblingBadge(`Hope ${token}`).textContent();
    expect(gilBadge?.startsWith('1.')).toBe(true);
    expect(hopeBadge?.startsWith('1.')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 11IT39 — a shared group survives an absent connecting member
// ---------------------------------------------------------------------------

test.describe('Report results — a shared group survives an absent connecting member', { tag: ['@11IT39'] }, () => {
  test('S1 — A and C share a group through a B the filters exclude', async ({ page }) => {
    const token = uniqueToken();
    const otherToken = uniqueToken('Sib2');
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const abeId = await seedReportStudent(page, target, {
      firstName: 'Abe',
      lastName: token,
      dateOfBirth: '2016-02-02',
    });
    const caraId = await seedReportStudent(page, target, {
      firstName: 'Cara',
      lastName: token,
      dateOfBirth: '2012-02-02',
    });
    const beaId = await seedReportStudent(page, target, {
      firstName: 'Bea',
      lastName: otherToken,
      dateOfBirth: '2014-02-02',
    });
    await linkSiblings(page, abeId, beaId);
    await linkSiblings(page, beaId, caraId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(2);
    await expect(results.sectionFor(`Bea ${otherToken}`)).toHaveCount(0);
    await expect(results.siblingBadge(`Cara ${token}`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Abe ${token}`)).toHaveText('1.2');
  });

  test('S2 — the connecting sibling is waiting-list-only', async ({ page }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const danId = await seedReportStudent(page, target, {
      firstName: 'Dan',
      lastName: token,
      dateOfBirth: '2013-07-07',
    });
    const ellaId = await seedReportStudent(page, target, {
      firstName: 'Ella',
      lastName: token,
      dateOfBirth: '2015-07-07',
    });
    const waiting = await seedWaitingListEntry(page, { occurrenceType: 'AfterSchool', lastName: token });
    await linkSiblings(page, danId, waiting.studentId);
    await linkSiblings(page, waiting.studentId, ellaId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.siblingBadge(`Dan ${token}`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Ella ${token}`)).toHaveText('1.2');
    await expect(results.sectionFor(`Waiting ${token}`)).toHaveCount(0);
  });

  test('S3 — unconnected families stay separate, even when each has an absent member', async ({ page }) => {
    const token = uniqueToken();
    const otherToken = uniqueToken('Sib2');
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const finnId = await seedReportStudent(page, target, { firstName: 'Finn', lastName: token });
    const gailId = await seedReportStudent(page, target, { firstName: 'Gail', lastName: otherToken });
    await linkSiblings(page, finnId, gailId);

    const hanaId = await seedReportStudent(page, target, { firstName: 'Hana', lastName: token });
    const ianId = await seedReportStudent(page, target, { firstName: 'Ian', lastName: otherToken });
    await linkSiblings(page, hanaId, ianId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(2);
    await expect(results.siblingBadge(`Finn ${token}`)).toHaveCount(0);
    await expect(results.siblingBadge(`Hana ${token}`)).toHaveCount(0);
    await expect(results.sectionFor(`Gail ${otherToken}`)).toHaveCount(0);
    await expect(results.sectionFor(`Ian ${otherToken}`)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 11IT40 — groups are numbered by first appearance in the report
// ---------------------------------------------------------------------------

test.describe('Report results — groups are numbered by first appearance in the report', { tag: ['@11IT40'] }, () => {
  test('S1 — groups are numbered by first appearance, not by age or creation order', async ({ page }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const calId = await seedReportStudent(page, target, {
      firstName: 'Cal',
      lastName: `${token}Mokoena`,
      dateOfBirth: '2011-01-01',
    });
    const doraId = await seedReportStudent(page, target, {
      firstName: 'Dora',
      lastName: `${token}Mokoena`,
      dateOfBirth: '2016-01-01',
    });
    await linkSiblings(page, calId, doraId);

    const avaId = await seedReportStudent(page, target, {
      firstName: 'Ava',
      lastName: `${token}Naidoo`,
      dateOfBirth: '2015-01-01',
    });
    const eliId = await seedReportStudent(page, target, {
      firstName: 'Eli',
      lastName: `${token}Naidoo`,
      dateOfBirth: '2012-01-01',
    });
    await linkSiblings(page, avaId, eliId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    const names = await results.allSections().allTextContents();
    expect(names[0]).toContain(`Ava ${token}Naidoo`);
    expect(names[1]).toContain(`Cal ${token}Mokoena`);
    expect(names[2]).toContain(`Dora ${token}Mokoena`);
    expect(names[3]).toContain(`Eli ${token}Naidoo`);

    await expect(results.siblingBadge(`Eli ${token}Naidoo`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Ava ${token}Naidoo`)).toHaveText('1.2');
    await expect(results.siblingBadge(`Cal ${token}Mokoena`)).toHaveText('2.1');
    await expect(results.siblingBadge(`Dora ${token}Mokoena`)).toHaveText('2.2');
  });

  test('S2 — a family with only one member present takes no group number', async ({ page }) => {
    const token = uniqueToken();
    const otherToken = uniqueToken('Sib2');
    const reportsPage = await loginForReports(page);
    const target = await seedEnrollmentTarget(page);

    const abbyId = await seedReportStudent(page, target, { firstName: 'Abby', lastName: token });
    const zedId = await seedReportStudent(page, target, { firstName: 'Zed', lastName: otherToken });
    await linkSiblings(page, abbyId, zedId);

    const bramId = await seedReportStudent(page, target, {
      firstName: 'Bram',
      lastName: token,
      dateOfBirth: '2013-09-09',
    });
    const cleoId = await seedReportStudent(page, target, {
      firstName: 'Cleo',
      lastName: token,
      dateOfBirth: '2016-09-09',
    });
    await linkSiblings(page, bramId, cleoId);

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);

    const results = await runAndGetResults(page, builder);

    const names = await results.allSections().allTextContents();
    expect(names[0]).toContain(`Abby ${token}`);

    await expect(results.siblingBadge(`Abby ${token}`)).toHaveCount(0);
    await expect(results.siblingBadge(`Bram ${token}`)).toHaveText('1.1');
    await expect(results.siblingBadge(`Cleo ${token}`)).toHaveText('1.2');
  });
});
