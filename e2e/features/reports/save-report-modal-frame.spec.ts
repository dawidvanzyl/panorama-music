import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToReportsPage } from '../../fixtures/testUsers';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import { seedReportStudent, listSavedReportsViaApi } from '../../fixtures/reports';
import { countPosts } from '../../fixtures/authSubmit';
import { ReportsPage } from '../../pages/reports/ReportsPage';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';
import { SaveReportModal } from '../../pages/reports/SaveReportModal';

/** Every scenario signs in as a fresh account and seeds a student surnamed with its own token. */
function uniqueToken(): string {
  return `Mfr${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

interface TypedName {
  token: string;
  reportsPage: ReportsPage & { email: string };
  results: ReportResultsPage;
  modal: SaveReportModal;
  name: string;
  postsSent: () => number;
}

/** Runs a report on the token, opens Save report and types an unsaved name. */
async function openWithTypedName(page: Page): Promise<TypedName> {
  const token = uniqueToken();
  const reportsPage = await goToReportsPage(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  await seedReportStudent(page, target, { firstName: 'Nia', lastName: token });
  const postsSent = countPosts(page, '/api/reports');

  await reportsPage.createReport();
  const builder = new ReportBuilderPage(page);
  await expect(builder.filtersEmptyMessage).toBeVisible();
  await builder.addFilter();
  await builder.chooseAttribute(0, 'Student · Name');
  await builder.typeTextValue(0, token);
  await builder.runReport();
  const results = new ReportResultsPage(page);
  await expect(page).toHaveURL(/#\/reports\/results$/);
  await expect(results.subline).toBeVisible();

  await results.saveReport();
  const modal = new SaveReportModal(page);
  await modal.waitForOpen();
  const name = `${token} Unsaved`;
  await modal.fillName(name);
  return { token, reportsPage, results, modal, name, postsSent };
}

test.describe('Save Report modal — close control', { tag: ['@266IT35'] }, () => {
  test('close discards a typed report name', async ({ page }) => {
    const { results, modal, postsSent } = await openWithTypedName(page);
    await expect(modal.host.locator('.modal__header').getByRole('button', { name: 'Close', exact: true })).toHaveCount(1);

    await modal.closeButton.click();

    await modal.waitForClosed();
    await expect(results.saveReportButton).toBeVisible();
    await expect(results.title).toHaveText('New report');
    expect(postsSent()).toBe(0);
  });

  test('no report is listed afterwards', async ({ page }) => {
    const { token, reportsPage, results, modal } = await openWithTypedName(page);
    await modal.closeButton.click();
    await modal.waitForClosed();

    await results.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();
    await page.reload();
    await reportsPage.waitForLoaded();

    await expect(reportsPage.rowByName(token)).toHaveCount(0);
    const listed = await listSavedReportsViaApi(page);
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([]);
  });

  test('reopening shows the modal fresh, not the discarded name', async ({ page }) => {
    const { results, modal, name } = await openWithTypedName(page);
    await modal.closeButton.click();
    await modal.waitForClosed();

    await results.saveReport();
    await modal.waitForOpen();

    await expect(modal.nameInput).not.toHaveValue(name);
  });
});
