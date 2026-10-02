import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToReportsPage, loginAsRoles } from '../../fixtures/testUsers';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import {
  seedReportStudent,
  saveReportViaApi,
  listSavedReportsViaApi,
  getSavedReportViaApi,
  runSavedReportViaApi,
  updateReportViaApi,
  deleteReportViaApi,
  type RunReportBody,
} from '../../fixtures/reports';
import { switchToPrintMedia } from '../../fixtures/printMedia';
import { ReportsPage } from '../../pages/reports/ReportsPage';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';
import { SaveReportModal } from '../../pages/reports/SaveReportModal';

/**
 * The QA database is shared and filled in parallel, so every scenario mints
 * its own token and uses it as its seeded students' surname, or as part of a
 * saved report's own name, keeping one worker's rows out of another's.
 */
function uniqueToken(prefix = 'Sav'): string {
  return `${prefix}${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

const MINIMAL_DEFINITION: RunReportBody = { filters: [], columns: ['student.name'] };

/** Saves a report through the API from the already signed-in session, and returns its id. */
async function apiSave(
  page: Page,
  name: string,
  definition: RunReportBody = MINIMAL_DEFINITION
): Promise<string> {
  const { status, body } = await saveReportViaApi(page, { name, definition });
  expect(status).toBe(201);
  if (!body.id) throw new Error('save did not return an id');
  return body.id;
}

/** Opens the builder from a fresh sign-in, and returns it once its fields have loaded. */
async function openBuilder(
  page: Page,
  roles: UserRole[] = ['Teacher']
): Promise<{ reportsPage: ReportsPage & { email: string }; builder: ReportBuilderPage }> {
  const reportsPage = await goToReportsPage(page, roles);
  await reportsPage.createReport();
  const builder = new ReportBuilderPage(page);
  await expect(builder.filtersEmptyMessage).toBeVisible();
  return { reportsPage, builder };
}

async function runAndGetResults(
  page: Page,
  builder: ReportBuilderPage
): Promise<ReportResultsPage> {
  await builder.runReport();
  const results = new ReportResultsPage(page);
  await expect(page).toHaveURL(/#\/reports\/results$/);
  await expect(results.subline).toBeVisible();
  return results;
}

async function saveThroughModal(page: Page, name: string): Promise<void> {
  const modal = new SaveReportModal(page);
  await modal.waitForOpen();
  await modal.saveAs(name);
  await modal.waitForClosed();
}

/** The browser's own `yyyy-MM-dd HH:mm`, in its local time — matching how the app renders a run timestamp. */
async function captureNowFormatted(page: Page): Promise<string> {
  return page.evaluate(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
}

function extractTimestamp(text: string): string {
  const match = text.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
  if (!match) throw new Error(`no timestamp found in: "${text}"`);
  return match[1];
}

async function buildGrade4Filter(builder: ReportBuilderPage): Promise<void> {
  await builder.addFilter();
  await builder.chooseAttribute(0, 'Student · Grade');
  await builder.selectListValue(0, 'Grade 4');
  await builder.tickColumn('Class');
}

// ---------------------------------------------------------------------------
// 11IT19 — saving lists it for its creator
// ---------------------------------------------------------------------------

test.describe('Saving a built report lists it for its creator', { tag: ['@11IT19'] }, () => {
  test('save from the builder, listed with creator and no run', async ({ page }) => {
    const { reportsPage, builder } = await openBuilder(page, ['Teacher', 'Coordinator']);
    const email = reportsPage.email;

    await buildGrade4Filter(builder);
    await builder.save();
    const modal = new SaveReportModal(page);
    await modal.waitForOpen();
    await expect(modal.title).toHaveText('Save report');
    await modal.saveAs('Grade 4 Contacts');
    await modal.waitForClosed();

    await expect(builder.breadcrumbName).toHaveText('Grade 4 Contacts');
    await expect(builder.saveButton).toHaveCount(0);

    await builder.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();

    const rows = reportsPage.rowsByCreatedBy(email);
    await expect(rows).toHaveCount(1);
    const row = rows.first();
    await expect(reportsPage.nameCell(row)).toHaveText('Grade 4 Contacts');
    await expect(reportsPage.lastRunCell(row)).toHaveText('—');
    await expect(reportsPage.runButton(row)).toBeVisible();
  });

  test('the save persists and holds the definition', async ({ page }) => {
    const { reportsPage, builder } = await openBuilder(page, ['Teacher', 'Coordinator']);

    await buildGrade4Filter(builder);
    await builder.save();
    await saveThroughModal(page, 'Grade 4 Contacts');

    await builder.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();
    const row = reportsPage.rowsByCreatedBy(reportsPage.email).first();
    const id = await reportsPage.reportIdOf(row);

    await page.reload();
    await reportsPage.waitForLoaded();
    const reloadedRow = reportsPage.rowsByCreatedBy(reportsPage.email).first();
    await expect(reportsPage.nameCell(reloadedRow)).toHaveText('Grade 4 Contacts');
    await expect(reportsPage.lastRunCell(reloadedRow)).toHaveText('—');

    const { status, body } = await getSavedReportViaApi(page, id);
    expect(status).toBe(200);
    expect(body.definition?.filters).toEqual([
      { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
    ]);
    expect(body.definition?.columns).toEqual(['student.name', 'student.class']);
  });

  test('the list is sorted by name A to Z', async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher']);
    await apiSave(page, `${token} charlie`);
    await apiSave(page, `${token} Alpha`);
    await apiSave(page, `${token} bravo`);

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();

    const matchingRows = reportsPage.rows().filter({ hasText: token });
    const names = (
      await matchingRows.locator('[data-testid="saved-report-name"]').allTextContents()
    ).map((n) => n.trim());

    expect(names).toEqual([`${token} Alpha`, `${token} bravo`, `${token} charlie`]);
  });
});

// ---------------------------------------------------------------------------
// 11IT20 — the Save report modal's name rule
// ---------------------------------------------------------------------------

test.describe('The Save report modal requires a non-blank name', { tag: ['@11IT20'] }, () => {
  test('blank and whitespace names keep Save report unavailable', async ({ page }) => {
    const { builder } = await openBuilder(page);

    await builder.save();
    const modal = new SaveReportModal(page);
    await modal.waitForOpen();

    await expect(modal.saveButton).toBeDisabled();

    await modal.fillName('   ');
    await expect(modal.saveButton).toBeDisabled();

    await modal.fillName('x');
    await expect(modal.saveButton).toBeEnabled();

    await modal.fillName('');
    await expect(modal.saveButton).toBeDisabled();

    await expect(modal.text).toHaveText('Save this report to access it from the Reports list.');
    await expect(modal.nameInput).toHaveAttribute('placeholder', 'e.g. Grade 4 Contacts');
  });

  test('Cancel saves nothing', async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher', 'Coordinator']);
    await apiSave(page, `${token} Control`);

    const builder = new ReportBuilderPage(page);
    await builder.gotoNewReport();
    await expect(builder.filtersEmptyMessage).toBeVisible();

    await builder.save();
    const modal = new SaveReportModal(page);
    await modal.waitForOpen();
    await modal.fillName(`${token} Cancelled`);
    await modal.cancel();
    await modal.waitForClosed();

    await expect(builder.breadcrumbName).toHaveText('New report');
    await expect(builder.saveButton).toBeVisible();

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await expect(reportsPage.rowByName(`${token} Control`)).toBeVisible();
    await expect(reportsPage.rowByName(`${token} Cancelled`)).toHaveCount(0);
  });

  test('the server refuses a blank name regardless of the UI', async ({ page }) => {
    const email = await loginAsRoles(page, ['Teacher']);

    const { status, body } = await saveReportViaApi(page, {
      name: '   ',
      definition: MINIMAL_DEFINITION,
    });
    expect(status).toBe(400);
    expect(body.id).toBeUndefined();

    const list = await listSavedReportsViaApi(page);
    const rows = Array.isArray(list.body) ? list.body : [];
    expect(rows.some((r) => r.createdBy === email)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11IT21 — Save report from unsaved results
// ---------------------------------------------------------------------------

test.describe('Save report on unsaved results', { tag: ['@11IT21'] }, () => {
  test('Save report on unsaved results', async ({ page }) => {
    const token = uniqueToken();
    const { reportsPage, builder } = await openBuilder(page, ['Teacher', 'Coordinator']);
    const email = reportsPage.email;
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Nia', lastName: token });

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Name');
    await builder.typeTextValue(0, token);

    const results = await runAndGetResults(page, builder);
    await expect(results.title).toHaveText('New report');
    expect(await results.offeredActions()).toEqual([
      'Edit report',
      'Run again',
      'Save report',
      'Print',
    ]);

    const headersBefore = await results.headers().allTextContents();
    const sectionCountBefore = await results.allSections().count();

    await results.saveReport();
    await saveThroughModal(page, `${token} Contacts`);

    await expect(results.title).toHaveText(`${token} Contacts`);
    await expect(results.breadcrumbName).toHaveText(`${token} Contacts`);
    await expect(results.subline).toContainText(`· Created by ${email}`);
    expect(await results.offeredActions()).toEqual([
      'Edit report',
      'Run again',
      'Save report',
      'Print',
    ]);
    await expect(results.headers()).toHaveText(headersBefore);
    await expect(results.allSections()).toHaveCount(sectionCountBefore);
  });

  test('the save from the results is persisted', async ({ page }) => {
    const token = uniqueToken();
    const { reportsPage, builder } = await openBuilder(page, ['Teacher', 'Coordinator']);
    const email = reportsPage.email;
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Nia', lastName: token });

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Name');
    await builder.typeTextValue(0, token);

    const results = await runAndGetResults(page, builder);
    await results.saveReport();
    await saveThroughModal(page, `${token} Contacts`);

    await results.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();

    const row = reportsPage.rowByName(`${token} Contacts`);
    await expect(row).toHaveCount(1);
    await expect(reportsPage.createdByCell(row)).toHaveText(email);
  });

  test('cancelling on the results leaves it unsaved', async ({ page }) => {
    const { builder } = await openBuilder(page);
    const results = await runAndGetResults(page, builder);

    await results.saveReport();
    const modal = new SaveReportModal(page);
    await modal.waitForOpen();
    await modal.fillName('Whatever Name');
    await modal.cancel();
    await modal.waitForClosed();

    await expect(results.title).toHaveText('New report');
    await expect(results.subline).not.toContainText('Created by');
    await expect(results.saveReportButton).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 11IT22 — a saved report is listed for every Teacher, with its creator
// ---------------------------------------------------------------------------

test.describe(
  'A report saved by one Teacher is listed for another, with its creator',
  { tag: ['@11IT22'] },
  () => {
    test('another Teacher sees the report and its creator', async ({ page }) => {
      const token = uniqueToken();
      const emailA = await loginAsRoles(page, ['Teacher']);
      await apiSave(page, `${token} Shared`);

      const emailB = await loginAsRoles(page, ['Teacher']);
      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();

      const row = reportsPage.rowByName(`${token} Shared`);
      await expect(row).toHaveCount(1);
      await expect(reportsPage.createdByCell(row)).toHaveText(emailA);
      await expect(reportsPage.createdByCell(row)).not.toHaveText(emailB);
      await expect(reportsPage.lastRunCell(row)).toHaveText('—');
      await expect(reportsPage.runButton(row)).toBeVisible();
    });

    test('the API flags ownership per caller', async ({ page }) => {
      const token = uniqueToken();
      const emailA = await loginAsRoles(page, ['Teacher']);
      await apiSave(page, `${token} Shared`);

      await loginAsRoles(page, ['Teacher']);
      const { status, body } = await listSavedReportsViaApi(page);
      expect(status).toBe(200);
      const rows = Array.isArray(body) ? body : [];
      const entry = rows.find((r) => r.name === `${token} Shared`);
      expect(entry).toBeDefined();
      expect(entry?.createdBy).toBe(emailA);
      expect(entry?.isOwner).toBe(false);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT23 — running a saved report reads live data
// ---------------------------------------------------------------------------

test.describe('Running a saved report reflects the current state of the data', { tag: ['@11IT23'] }, () => {
  test('a run from the list uses live data, not a snapshot', async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Ivy', lastName: token, grade: 'Grade4' });
    const id = await apiSave(page, `${token} Grade 4`, {
      filters: [
        { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
        { field: 'student.name', operator: 'contains', values: [token] },
      ],
      columns: ['student.name'],
    });
    await seedReportStudent(page, target, { firstName: 'Jade', lastName: token, grade: 'Grade4' });
    await seedReportStudent(page, target, { firstName: 'Omar', lastName: token, grade: 'Grade5' });

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();
    await reportsPage.run(reportsPage.rowById(id));

    const results = new ReportResultsPage(page);
    await expect(page).toHaveURL(new RegExp(`#/reports/${id}$`));
    await expect(results.subline).toBeVisible();
    await expect(results.title).toHaveText(`${token} Grade 4`);
    await expect(results.sectionFor(`Ivy ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Jade ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Omar ${token}`)).toHaveCount(0);
    await expect(results.subline).toContainText(/^2 students/);
  });

  test('Run again on saved results also reads live data', async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Ivy', lastName: token, grade: 'Grade4' });
    const id = await apiSave(page, `${token} Grade 4`, {
      filters: [
        { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
        { field: 'student.name', operator: 'contains', values: [token] },
      ],
      columns: ['student.name'],
    });
    await seedReportStudent(page, target, { firstName: 'Jade', lastName: token, grade: 'Grade4' });

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();
    await reportsPage.run(reportsPage.rowById(id));

    const results = new ReportResultsPage(page);
    await expect(results.subline).toBeVisible();
    await expect(results.subline).toContainText(/^2 students/);

    await seedReportStudent(page, target, { firstName: 'Kim', lastName: token, grade: 'Grade4' });
    await results.runAgain();

    await expect(results.sectionFor(`Kim ${token}`)).toHaveCount(1);
    await expect(results.title).toHaveText(`${token} Grade 4`);
    await expect(results.subline).toContainText(/^3 students/);
  });

  test('the saved-results page stands on its own, with labels and no raw keys', async ({
    page,
  }) => {
    const token = uniqueToken();
    const email = await loginAsRoles(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Ivy', lastName: token, grade: 'Grade4' });
    const id = await apiSave(page, `${token} Grade 4`, {
      filters: [
        { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
        { field: 'student.name', operator: 'contains', values: [token] },
      ],
      columns: ['student.name'],
    });

    await page.goto(`/#/reports/${id}`);
    const results = new ReportResultsPage(page);
    await expect(results.subline).toBeVisible();
    await expect(results.title).toHaveText(`${token} Grade 4`);
    await expect(page.locator('pm-reports-page')).toHaveCount(0);

    await switchToPrintMedia(page);
    await expect(results.printFilters).toContainText('Grade = Grade 4');
    await expect(results.printFilters).toContainText(`Name contains ${token}`);
    await expect(results.printFilters).not.toContainText('student.');
    await expect(results.printFilters).not.toContainText('Grade4');

    const runLineText = ((await results.printRunLine.textContent()) ?? '').trim();
    expect(runLineText.endsWith(`· Created by ${email}`)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 11IT24 — running a saved report updates Last run
// ---------------------------------------------------------------------------

test.describe('Running a saved report sets its Last run', { tag: ['@11IT24'] }, () => {
  test("running from the list sets Last run to that run's time", async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher']);
    const id = await apiSave(page, `${token} Timed`);

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();

    const row = reportsPage.rowById(id);
    await expect(reportsPage.lastRunCell(row)).toHaveText('—');

    const t0 = await captureNowFormatted(page);
    await reportsPage.run(row);

    const results = new ReportResultsPage(page);
    await expect(results.subline).toBeVisible();
    const t1 = await captureNowFormatted(page);
    const runTimestamp = extractTimestamp((await results.subline.textContent()) ?? '');
    expect([t0, t1]).toContain(runTimestamp);

    await results.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();
    await expect(reportsPage.lastRunCell(reportsPage.rowById(id))).toHaveText(runTimestamp);
  });

  test('Last run persists across a reload and advances on a later run', async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher']);
    const id = await apiSave(page, `${token} Timed2`);

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();
    await reportsPage.run(reportsPage.rowById(id));

    const results = new ReportResultsPage(page);
    await expect(results.subline).toBeVisible();

    await results.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();
    const l1 = ((await reportsPage.lastRunCell(reportsPage.rowById(id)).textContent()) ?? '').trim();

    await page.reload();
    await reportsPage.waitForLoaded();
    await expect(reportsPage.lastRunCell(reportsPage.rowById(id))).toHaveText(l1);

    const r1 = await getSavedReportViaApi(page, id);

    const t2 = await captureNowFormatted(page);
    await reportsPage.run(reportsPage.rowById(id));
    await expect(results.subline).toBeVisible();
    const t3 = await captureNowFormatted(page);

    await results.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();
    const l2 = ((await reportsPage.lastRunCell(reportsPage.rowById(id)).textContent()) ?? '').trim();
    expect([t2, t3]).toContain(l2);

    const r2 = await getSavedReportViaApi(page, id);
    expect(new Date(r2.body.lastRunAt ?? 0).getTime()).toBeGreaterThan(
      new Date(r1.body.lastRunAt ?? 0).getTime()
    );
  });

  test('a run by another Teacher updates Last run too', async ({ page }) => {
    const token = uniqueToken();
    await loginAsRoles(page, ['Teacher']);
    const id = await apiSave(page, `${token} Anyone`);

    await loginAsRoles(page, ['Teacher']);
    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();

    const t0 = await captureNowFormatted(page);
    await reportsPage.run(reportsPage.rowById(id));
    const results = new ReportResultsPage(page);
    await expect(results.subline).toBeVisible();
    const t1 = await captureNowFormatted(page);

    await results.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();
    const lastRun = ((await reportsPage.lastRunCell(reportsPage.rowById(id)).textContent()) ?? '').trim();
    expect(lastRun).not.toBe('—');
    expect([t0, t1]).toContain(lastRun);
  });
});

// ---------------------------------------------------------------------------
// 11IT25 — a non-creator's results offer only Run again and Print
// ---------------------------------------------------------------------------

test.describe(
  'A saved report offers a non-creator only Run again and Print',
  { tag: ['@11IT25'] },
  () => {
    test('a non-creator is offered exactly Run again and Print', async ({ page }) => {
      const token = uniqueToken();
      const emailA = await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Others`);

      await loginAsRoles(page, ['Teacher']);
      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.run(reportsPage.rowById(id));

      const results = new ReportResultsPage(page);
      await expect(results.subline).toBeVisible();
      await expect(results.title).toHaveText(`${token} Others`);
      await expect(results.subline).toContainText(`· Created by ${emailA}`);
      expect(await results.offeredActions()).toEqual(['Run again', 'Print']);
      await expect(results.editButton).toHaveCount(0);
      await expect(results.saveReportButton).toHaveCount(0);
    });

    test('Run again keeps the restricted set', async ({ page }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Others2`);

      await loginAsRoles(page, ['Teacher']);
      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.run(reportsPage.rowById(id));

      const results = new ReportResultsPage(page);
      await expect(results.subline).toBeVisible();

      const t0 = await captureNowFormatted(page);
      await results.runAgain();
      await expect(results.subline).toBeVisible();
      const t1 = await captureNowFormatted(page);
      const runTimestamp = extractTimestamp((await results.subline.textContent()) ?? '');
      expect([t0, t1]).toContain(runTimestamp);

      expect(await results.offeredActions()).toEqual(['Run again', 'Print']);
    });

    test('the restriction holds after a reload of the saved-results route', async ({ page }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Others3`);

      await loginAsRoles(page, ['Teacher']);
      await page.goto(`/#/reports/${id}`);
      const results = new ReportResultsPage(page);
      await expect(results.subline).toBeVisible();
      await expect(results.title).toHaveText(`${token} Others3`);
      expect(await results.offeredActions()).toEqual(['Run again', 'Print']);
    });

    test('the creator also gets exactly Edit report, Run again, Save report, Print', async ({
      page,
    }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Mine`);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.run(reportsPage.rowById(id));

      const results = new ReportResultsPage(page);
      await expect(results.subline).toBeVisible();
      expect(await results.offeredActions()).toEqual([
        'Edit report',
        'Run again',
        'Save report',
        'Print',
      ]);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT32 — the saved-reports endpoints are Teacher-only
// ---------------------------------------------------------------------------

test.describe(
  'The saved-reports endpoints are refused to non-Teachers',
  { tag: ['@11IT32'] },
  () => {
    const NON_TEACHER_ROLE_SETS: { label: string; roles: UserRole[] }[] = [
      { label: 'coordinator', roles: ['Coordinator'] },
      { label: 'bankingcoordinator', roles: ['BankingCoordinator'] },
      { label: 'admin', roles: ['Admin'] },
    ];

    for (const { label, roles } of NON_TEACHER_ROLE_SETS) {
      test(`list and run are forbidden to a ${label}`, async ({ page }) => {
        const token = uniqueToken();
        await loginAsRoles(page, ['Teacher']);
        const id = await apiSave(page, `${token} Guarded`);

        await loginAsRoles(page, roles);
        const list = await listSavedReportsViaApi(page);
        expect(list.status).toBe(403);
        expect(Array.isArray(list.body)).toBe(false);

        const run = await runSavedReportViaApi(page, id);
        expect(run.status).toBe(403);
        expect(run.body.sections).toBeUndefined();
        expect(run.body.name).toBeUndefined();
        expect(run.body.studentCount).toBeUndefined();
      });
    }

    test('the other saved-report endpoints are forbidden too', async ({ page }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Guarded2`);

      await loginAsRoles(page, ['Coordinator']);
      const getResult = await getSavedReportViaApi(page, id);
      expect(getResult.status).toBe(403);
      expect(getResult.body.definition).toBeUndefined();

      const saveResult = await saveReportViaApi(page, {
        name: `${token} Intruder`,
        definition: MINIMAL_DEFINITION,
      });
      expect(saveResult.status).toBe(403);

      const updateResult = await updateReportViaApi(page, id, {
        name: `${token} Hijacked`,
        definition: MINIMAL_DEFINITION,
      });
      expect(updateResult.status).toBe(403);

      const deleteResult = await deleteReportViaApi(page, id);
      expect(deleteResult.status).toBe(403);

      await loginAsRoles(page, ['Teacher']);
      const list = await listSavedReportsViaApi(page);
      const rows = Array.isArray(list.body) ? list.body : [];
      expect(rows.some((r) => r.name === `${token} Intruder`)).toBe(false);
      expect(rows.some((r) => r.name === `${token} Hijacked`)).toBe(false);

      const read = await getSavedReportViaApi(page, id);
      expect(read.status).toBe(200);
      expect(read.body.name).toBe(`${token} Guarded2`);
    });

    test('control: a Teacher is allowed', async ({ page }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Guarded3`);

      const list = await listSavedReportsViaApi(page);
      expect(list.status).toBe(200);
      const rows = Array.isArray(list.body) ? list.body : [];
      expect(rows.some((r) => r.name === `${token} Guarded3`)).toBe(true);

      const run = await runSavedReportViaApi(page, id);
      expect(run.status).toBe(200);
      expect(run.body.name).toBe(`${token} Guarded3`);
    });
  }
);
