import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToReportsPage } from '../../fixtures/testUsers';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import { seedReportStudent } from '../../fixtures/reports';
import { expectCancelThenConfirm, expectNoHeaderIcon, expectTitled } from '../../fixtures/modalWording';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';
import { SaveReportModal } from '../../pages/reports/SaveReportModal';

function uniqueToken(): string {
  return `Mwd${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

async function openFromUnsavedResults(page: Page) {
  const token = uniqueToken();
  const reportsPage = await goToReportsPage(page, ['Teacher', 'Coordinator']);
  await reportsPage.createReport();
  const builder = new ReportBuilderPage(page);
  await expect(builder.filtersEmptyMessage).toBeVisible();
  const target = await seedEnrollmentTarget(page);
  await seedReportStudent(page, target, { firstName: 'Nia', lastName: token });

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
  return { token, reportsPage, results, modal };
}

test.describe('Save Report modal — title, icon and confirm label', { tag: ['@266IT26'] }, () => {
  test('S1 wording from unsaved results', async ({ page }) => {
    const { modal } = await openFromUnsavedResults(page);

    await expectTitled(modal.host, 'Save Report');
    await expectNoHeaderIcon(modal.host);
    await expectCancelThenConfirm(modal.host, 'Save Report');
    await expect(modal.host.getByRole('button', { name: 'Save report', exact: true })).toHaveCount(0);
  });

  test('S2 the renamed confirm still saves the report', async ({ page }) => {
    const { token, reportsPage, results, modal } = await openFromUnsavedResults(page);
    const name = `${token} Kept`;

    await modal.fillName(name);
    await modal.saveButton.click();
    await modal.waitForClosed();

    await expect(results.title).toHaveText(name);
    await results.followReportsBreadcrumb();
    await reportsPage.waitForLoaded();
    await page.reload();
    await reportsPage.waitForLoaded();
    await expect(reportsPage.rowByName(name)).toBeVisible();
  });
});
