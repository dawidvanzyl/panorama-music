import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import {
  seedReportStudent,
  saveReportViaApi,
  getSavedReportViaApi,
  listSavedReportsViaApi,
  updateReportViaApi,
  deleteReportViaApi,
  type RunReportBody,
} from '../../fixtures/reports';
import { ReportsPage } from '../../pages/reports/ReportsPage';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';
import { SaveReportModal } from '../../pages/reports/SaveReportModal';
import { DeleteReportModal } from '../../pages/reports/DeleteReportModal';

/**
 * The QA database is shared and filled in parallel, so every scenario mints
 * its own token and uses it as its seeded students' surname, or as part of a
 * saved report's own name, keeping one worker's rows out of another's.
 */
function uniqueToken(prefix = 'Edt'): string {
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

// ---------------------------------------------------------------------------
// 11IT26 — Edit and Delete appear only on the viewer's own reports
// ---------------------------------------------------------------------------

test.describe(
  'Own rows offer Edit and Delete; another Teacher’s offer Run only',
  { tag: ['@11IT26'] },
  () => {
    test('S1 — own rows offer Edit and Delete; another Teacher’s offer Run only', async ({
      page,
    }) => {
      const token = uniqueToken();
      const emailA = await loginAsRoles(page, ['Teacher']);
      await apiSave(page, `${token} Theirs`);

      await loginAsRoles(page, ['Teacher']);
      await apiSave(page, `${token} Mine`);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();

      const mineRow = reportsPage.rowByName(`${token} Mine`);
      await expect(mineRow).toHaveCount(1);
      expect(await reportsPage.actionNames(mineRow)).toEqual(['Run', 'Edit', 'Delete']);

      const theirsRow = reportsPage.rowByName(`${token} Theirs`);
      await expect(theirsRow).toHaveCount(1);
      expect(await reportsPage.actionNames(theirsRow)).toEqual(['Run']);
      await expect(reportsPage.editButton(theirsRow)).toHaveCount(0);
      await expect(reportsPage.deleteButton(theirsRow)).toHaveCount(0);
      await expect(reportsPage.createdByCell(theirsRow)).toHaveText(emailA);
    });

    test('S2 — the same page after a reload', async ({ page }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      await apiSave(page, `${token} Theirs`);

      await loginAsRoles(page, ['Teacher']);
      await apiSave(page, `${token} Mine`);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await page.reload();
      await reportsPage.waitForLoaded();

      expect(await reportsPage.actionNames(reportsPage.rowByName(`${token} Mine`))).toEqual([
        'Run',
        'Edit',
        'Delete',
      ]);
      expect(await reportsPage.actionNames(reportsPage.rowByName(`${token} Theirs`))).toEqual([
        'Run',
      ]);
    });

    test('S3 — a non-creator who opens a report’s edit address is returned to Reports', async ({
      page,
    }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Theirs`, {
        filters: [{ field: 'student.grade', operator: 'equals', values: ['Grade4'] }],
        columns: ['student.name'],
      });

      await loginAsRoles(page, ['Teacher']);
      const builder = new ReportBuilderPage(page);
      await builder.gotoEditReport(id);

      await expect(page).toHaveURL(/#\/reports$/);
      await expect(page.locator('pm-report-builder-page')).toHaveCount(0);

      const { status, body } = await getSavedReportViaApi(page, id);
      expect(status).toBe(200);
      expect(body.name).toBe(`${token} Theirs`);
      expect(body.definition?.filters).toEqual([
        { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
      ]);
    });

    test('S4 — control: the creator can open the same kind of address', async ({ page }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Mine`);

      const builder = new ReportBuilderPage(page);
      await builder.gotoEditReport(id);

      await expect(builder.breadcrumbName).toHaveText(`${token} Mine`);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT27 — editing a saved report changes it in place
// ---------------------------------------------------------------------------

/**
 * Signs in as Teacher + Coordinator, seeds two enrolled students (Ivy Grade 4
 * and Omar Grade 5, both surnamed with the token) and saves "{token} Contacts"
 * filtered to Grade 4 and the token name, columns Student only.
 */
async function seedContactsReport(
  page: Page
): Promise<{ token: string; email: string; id: string }> {
  const token = uniqueToken();
  const email = await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  await seedReportStudent(page, target, { firstName: 'Ivy', lastName: token, grade: 'Grade4' });
  await seedReportStudent(page, target, { firstName: 'Omar', lastName: token, grade: 'Grade5' });
  const id = await apiSave(page, `${token} Contacts`, {
    filters: [
      { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
      { field: 'student.name', operator: 'contains', values: [token] },
    ],
    columns: ['student.name'],
  });
  return { token, email, id };
}

test.describe(
  'Editing a saved report changes its filter and reruns it without a duplicate',
  { tag: ['@11IT27'] },
  () => {
    test('S1 — edit, change a filter, save with the pre-filled name, run from the list', async ({
      page,
    }) => {
      const { token, id } = await seedContactsReport(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.edit(reportsPage.rowByName(`${token} Contacts`));

      const builder = new ReportBuilderPage(page);
      await expect(page).toHaveURL(new RegExp(`#/reports/${id}/edit$`));
      await expect(builder.breadcrumbName).toHaveText(`${token} Contacts`);
      await expect(builder.filterRows()).toHaveCount(2);
      expect(await builder.selectedAttributeLabel(0)).toBe('Student · Grade');
      expect(await builder.selectedOperatorLabel(0)).toBe('is');
      expect(await builder.selectedValueLabel(0)).toBe('Grade 4');
      expect(await builder.selectedAttributeLabel(1)).toBe('Student · Name');
      expect(await builder.selectedOperatorLabel(1)).toBe('contains');
      await expect(builder.filterRow(1).locator('.filter-row__value[type="text"]')).toHaveValue(
        token
      );
      expect(await builder.isColumnTicked('student.name')).toBe(true);

      await builder.selectListValue(0, 'Grade 5');
      await builder.save();
      const saveModal = new SaveReportModal(page);
      await saveModal.waitForOpen();
      await expect(saveModal.nameInput).toHaveValue(`${token} Contacts`);
      await saveModal.confirm();
      await saveModal.waitForClosed();
      await expect(builder.breadcrumbName).toHaveText(`${token} Contacts`);

      await builder.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();
      const matchingRows = reportsPage.rows().filter({ hasText: token });
      await expect(matchingRows).toHaveCount(1);
      expect(await reportsPage.reportIdOf(matchingRows.first())).toBe(id);

      await reportsPage.run(reportsPage.rowById(id));
      const results = new ReportResultsPage(page);
      await expect(page).toHaveURL(new RegExp(`#/reports/${id}$`));
      await expect(results.title).toHaveText(`${token} Contacts`);
      await expect(results.sectionFor(`Omar ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Ivy ${token}`)).toHaveCount(0);
      await expect(results.subline).toContainText(/^1 student/);

      await results.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();
      await page.reload();
      await reportsPage.waitForLoaded();
      await expect(reportsPage.rows().filter({ hasText: token })).toHaveCount(1);

      const read = await getSavedReportViaApi(page, id);
      expect(read.body.definition?.filters).toContainEqual({
        field: 'student.grade',
        operator: 'equals',
        values: ['Grade5'],
      });
    });

    test('S2 — renaming through the pre-filled dialog updates the same report', async ({
      page,
    }) => {
      const { token, email, id } = await seedContactsReport(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.edit(reportsPage.rowByName(`${token} Contacts`));

      const builder = new ReportBuilderPage(page);
      await builder.save();
      const saveModal = new SaveReportModal(page);
      await saveModal.waitForOpen();
      await saveModal.fillName(`${token} Renamed`);
      await saveModal.confirm();
      await saveModal.waitForClosed();
      await expect(builder.breadcrumbName).toHaveText(`${token} Renamed`);

      await builder.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();

      const matchingRows = reportsPage.rows().filter({ hasText: token });
      await expect(matchingRows).toHaveCount(1);
      const row = matchingRows.first();
      expect(await reportsPage.reportIdOf(row)).toBe(id);
      await expect(reportsPage.nameCell(row)).toHaveText(`${token} Renamed`);
      await expect(reportsPage.rowByName(`${token} Contacts`)).toHaveCount(0);
      await expect(reportsPage.createdByCell(row)).toHaveText(email);
      await expect(reportsPage.lastRunCell(row)).toHaveText('—');
    });

    test('S3 — Run report in the edit builder does not save and does not count as a run', async ({
      page,
    }) => {
      const { token, id } = await seedContactsReport(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.edit(reportsPage.rowByName(`${token} Contacts`));

      const builder = new ReportBuilderPage(page);
      await builder.selectListValue(0, 'Grade 5');
      const results = new ReportResultsPage(page);
      await builder.runReport();
      await expect(results.subline).toBeVisible();
      await expect(results.sectionFor(`Omar ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Ivy ${token}`)).toHaveCount(0);

      await results.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();
      await page.reload();
      await reportsPage.waitForLoaded();

      const matchingRows = reportsPage.rows().filter({ hasText: token });
      await expect(matchingRows).toHaveCount(1);
      await expect(reportsPage.lastRunCell(matchingRows.first())).toHaveText('—');

      const read = await getSavedReportViaApi(page, id);
      expect(read.body.lastRunAt ?? null).toBeNull();
      expect(read.body.definition?.filters).toContainEqual({
        field: 'student.grade',
        operator: 'equals',
        values: ['Grade4'],
      });
    });

    test('S4 — cancelling the pre-filled dialog saves nothing', async ({ page }) => {
      const { token, id } = await seedContactsReport(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.edit(reportsPage.rowByName(`${token} Contacts`));

      const builder = new ReportBuilderPage(page);
      await builder.selectListValue(0, 'Grade 5');
      await builder.save();
      const saveModal = new SaveReportModal(page);
      await saveModal.waitForOpen();
      await saveModal.cancel();
      await saveModal.waitForClosed();

      await expect(builder.breadcrumbName).toHaveText(`${token} Contacts`);

      const read = await getSavedReportViaApi(page, id);
      expect(read.body.definition?.filters).toContainEqual({
        field: 'student.grade',
        operator: 'equals',
        values: ['Grade4'],
      });

      await builder.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();
      await expect(reportsPage.rows().filter({ hasText: token })).toHaveCount(1);
    });

    test('S5 — the creator’s saved results offer Edit report and Save report, and neither creates a second report', async ({
      page,
    }) => {
      const { token, id } = await seedContactsReport(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.run(reportsPage.rowByName(`${token} Contacts`));

      const results = new ReportResultsPage(page);
      await expect(results.subline).toBeVisible();
      expect(await results.offeredActions()).toEqual([
        'Edit report',
        'Run again',
        'Save report',
        'Print',
      ]);

      await results.editReport();
      const builder = new ReportBuilderPage(page);
      await expect(page).toHaveURL(new RegExp(`#/reports/${id}/edit$`));
      await expect(builder.breadcrumbName).toHaveText(`${token} Contacts`);
      expect(await builder.selectedAttributeLabel(0)).toBe('Student · Grade');
      expect(await builder.selectedValueLabel(0)).toBe('Grade 4');
      expect(await builder.selectedAttributeLabel(1)).toBe('Student · Name');

      await builder.selectListValue(0, 'Grade 5');
      const resultsAgain = new ReportResultsPage(page);
      await builder.runReport();
      await expect(resultsAgain.subline).toBeVisible();
      await expect(resultsAgain.sectionFor(`Omar ${token}`)).toHaveCount(1);
      await expect(resultsAgain.sectionFor(`Ivy ${token}`)).toHaveCount(0);

      await resultsAgain.saveReport();
      const saveModal = new SaveReportModal(page);
      await saveModal.waitForOpen();
      await expect(saveModal.nameInput).toHaveValue(`${token} Contacts`);
      await saveModal.confirm();
      await saveModal.waitForClosed();
      await expect(resultsAgain.title).toHaveText(`${token} Contacts`);

      await resultsAgain.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();
      const matchingRows = reportsPage.rows().filter({ hasText: token });
      await expect(matchingRows).toHaveCount(1);
      expect(await reportsPage.reportIdOf(matchingRows.first())).toBe(id);

      const read = await getSavedReportViaApi(page, id);
      expect(read.body.definition?.filters).toContainEqual({
        field: 'student.grade',
        operator: 'equals',
        values: ['Grade5'],
      });
    });

    test('S6 — Save report on the creator’s saved results can rename without a duplicate', async ({
      page,
    }) => {
      const { token, id } = await seedContactsReport(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.run(reportsPage.rowByName(`${token} Contacts`));

      const results = new ReportResultsPage(page);
      await expect(results.subline).toBeVisible();
      await results.saveReport();
      const saveModal = new SaveReportModal(page);
      await saveModal.waitForOpen();
      await expect(saveModal.nameInput).toHaveValue(`${token} Contacts`);
      await saveModal.fillName(`${token} Renamed`);
      await saveModal.confirm();
      await saveModal.waitForClosed();
      await expect(results.title).toHaveText(`${token} Renamed`);

      await results.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();
      const matchingRows = reportsPage.rows().filter({ hasText: token });
      await expect(matchingRows).toHaveCount(1);
      const row = matchingRows.first();
      expect(await reportsPage.reportIdOf(row)).toBe(id);
      await expect(reportsPage.nameCell(row)).toHaveText(`${token} Renamed`);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT28 — deleting a saved report
// ---------------------------------------------------------------------------

test.describe(
  'Deleting a saved report, with confirm and cancel',
  { tag: ['@11IT28'] },
  () => {
    async function seedDoomedAndKeep(page: Page): Promise<{
      token: string;
      doomedId: string;
      keepId: string;
    }> {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const doomedId = await apiSave(page, `${token} Doomed`);
      const keepId = await apiSave(page, `${token} Keep`);
      return { token, doomedId, keepId };
    }

    test('S1 — delete and confirm removes the report', async ({ page }) => {
      const { token, doomedId } = await seedDoomedAndKeep(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.requestDelete(reportsPage.rowByName(`${token} Doomed`));

      const modal = new DeleteReportModal(page);
      await modal.waitForOpen();
      await expect(modal.title).toHaveText('Delete report');
      await expect(modal.text).toHaveText(
        `Are you sure you want to delete the report ${token} Doomed? This cannot be undone.`
      );
      await expect(modal.name).toHaveText(`${token} Doomed`);

      await modal.confirm();
      await modal.waitForClosed();

      await expect(reportsPage.rowByName(`${token} Doomed`)).toHaveCount(0);
      await expect(reportsPage.rowByName(`${token} Keep`)).toBeVisible();

      await page.reload();
      await reportsPage.waitForLoaded();
      await expect(reportsPage.rowByName(`${token} Doomed`)).toHaveCount(0);
      await expect(reportsPage.rowByName(`${token} Keep`)).toBeVisible();

      const read = await getSavedReportViaApi(page, doomedId);
      expect(read.status).toBe(404);
    });

    test('S2 — delete and cancel leaves the report listed', async ({ page }) => {
      const { token } = await seedDoomedAndKeep(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();
      await reportsPage.requestDelete(reportsPage.rowByName(`${token} Doomed`));

      const modal = new DeleteReportModal(page);
      await modal.waitForOpen();
      await modal.cancel();
      await modal.waitForClosed();

      const row = reportsPage.rowByName(`${token} Doomed`);
      await expect(row).toBeVisible();
      expect(await reportsPage.actionNames(row)).toEqual(['Run', 'Edit', 'Delete']);

      await page.reload();
      await reportsPage.waitForLoaded();
      await expect(reportsPage.rowByName(`${token} Doomed`)).toBeVisible();

      const read = await getSavedReportViaApi(page, await reportsPage.reportIdOf(row));
      expect(read.status).toBe(200);
      expect(read.body.name).toBe(`${token} Doomed`);
    });

    test('S3 — cancel then delete targets the right report', async ({ page }) => {
      const { token, doomedId } = await seedDoomedAndKeep(page);

      const reportsPage = new ReportsPage(page);
      await reportsPage.gotoReports();
      await reportsPage.waitForLoaded();

      await reportsPage.requestDelete(reportsPage.rowByName(`${token} Keep`));
      const modal = new DeleteReportModal(page);
      await modal.waitForOpen();
      await modal.cancel();
      await modal.waitForClosed();

      await reportsPage.requestDelete(reportsPage.rowByName(`${token} Doomed`));
      await modal.waitForOpen();
      await expect(modal.name).toHaveText(`${token} Doomed`);
      await modal.confirm();
      await modal.waitForClosed();

      await expect(reportsPage.rowByName(`${token} Doomed`)).toHaveCount(0);
      await expect(reportsPage.rowByName(`${token} Keep`)).toBeVisible();

      const read = await getSavedReportViaApi(page, doomedId);
      expect(read.status).toBe(404);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT29 — the API refuses an edit or delete from anyone but the creator
// ---------------------------------------------------------------------------

test.describe(
  'Updating or deleting a report through the API is refused to a non-creator',
  { tag: ['@11IT29'] },
  () => {
    async function seedOwnedByA(page: Page): Promise<{ token: string; id: string }> {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Owned`, {
        filters: [{ field: 'student.grade', operator: 'equals', values: ['Grade4'] }],
        columns: ['student.name', 'student.class'],
      });
      await loginAsRoles(page, ['Teacher']);
      return { token, id };
    }

    test('S1 — an update by a non-creator is refused and changes nothing', async ({ page }) => {
      const { token, id } = await seedOwnedByA(page);

      const { status, body } = await updateReportViaApi(page, id, {
        name: `${token} Hijacked`,
        definition: { filters: [], columns: ['student.name'] },
      });
      expect(status).toBe(403);
      expect(body.id).toBeUndefined();
      expect(body.name).toBeUndefined();
      expect(body.definition).toBeUndefined();

      const read = await getSavedReportViaApi(page, id);
      expect(read.body.name).toBe(`${token} Owned`);
      expect(read.body.definition?.filters).toEqual([
        { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
      ]);
      expect(read.body.definition?.columns).toEqual(['student.name', 'student.class']);

      const list = await listSavedReportsViaApi(page);
      const rows = Array.isArray(list.body) ? list.body : [];
      expect(rows.some((r) => r.name === `${token} Hijacked`)).toBe(false);
      expect(rows.some((r) => r.name === `${token} Owned`)).toBe(true);
    });

    test('S2 — a delete by a non-creator is refused and the report remains', async ({ page }) => {
      const { token, id } = await seedOwnedByA(page);

      const { status } = await deleteReportViaApi(page, id);
      expect(status).toBe(403);

      const read = await getSavedReportViaApi(page, id);
      expect(read.status).toBe(200);
      expect(read.body.name).toBe(`${token} Owned`);
    });

    test('S3 — the refusal does not depend on the name or definition the request carries', async ({
      page,
    }) => {
      const { id } = await seedOwnedByA(page);

      const { status } = await updateReportViaApi(page, id, {
        name: '   ',
        definition: {
          filters: [{ field: 'not.a.real.field', operator: 'equals', values: ['x'] }],
          columns: ['student.name'],
        },
      });
      expect(status).toBe(403);

      const read = await getSavedReportViaApi(page, id);
      expect(read.body.definition?.filters).toEqual([
        { field: 'student.grade', operator: 'equals', values: ['Grade4'] },
      ]);
    });

    test('S4 — control: the creator’s own update and delete succeed', async ({ page }) => {
      const token = uniqueToken();
      await loginAsRoles(page, ['Teacher']);
      const id = await apiSave(page, `${token} Own`);

      const update = await updateReportViaApi(page, id, {
        name: `${token} Own2`,
        definition: { filters: [], columns: ['student.name'] },
      });
      expect(update.status).toBe(200);
      expect(update.body.name).toBe(`${token} Own2`);
      expect(update.body.isOwner).toBe(true);

      const read = await getSavedReportViaApi(page, id);
      expect(read.body.name).toBe(`${token} Own2`);

      const del = await deleteReportViaApi(page, id);
      expect(del.status).toBe(204);

      const readAfterDelete = await getSavedReportViaApi(page, id);
      expect(readAfterDelete.status).toBe(404);
    });
  }
);
