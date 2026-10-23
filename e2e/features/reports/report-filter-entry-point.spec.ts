import { test, expect } from '../../fixtures/base';
import { goToReportsPage } from '../../fixtures/testUsers';
import { listSavedReportsViaApi } from '../../fixtures/reports';
import { trackApiRequests } from '../../fixtures/studentPrint';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';

async function openNewReport(page: import('@playwright/test').Page): Promise<ReportBuilderPage> {
  await goToReportsPage(page);
  const builder = new ReportBuilderPage(page);
  const fieldsLoaded = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/reports/fields');
  await builder.gotoNewReport();
  await fieldsLoaded;
  await expect(builder.filtersEmptyMessage).toBeVisible();
  return builder;
}

test.describe('Entry points — the report filters panel offers "Add Filter"', { tag: ['@267IT27'] }, () => {
  test('the entry point reads "Add Filter"', async ({ page }) => {
    const builder = await openNewReport(page);

    await expect(builder.host.getByRole('button', { name: 'Add Filter', exact: true })).toBeVisible();
    await expect(builder.host.getByRole('button', { name: '+ Add filter', exact: true })).toHaveCount(0);
    await expect(builder.host.getByRole('button', { name: 'Add filter', exact: true })).toHaveCount(0);
  });

  test('clicking adds a row and creates no record', async ({ page }) => {
    const builder = await openNewReport(page);
    const before = await listSavedReportsViaApi(page);
    const requests = trackApiRequests(page);
    const mark = requests.mark();
    const addFilter = builder.host.getByRole('button', { name: 'Add Filter', exact: true });

    await addFilter.click();
    await expect(builder.filterRows()).toHaveCount(1);
    await expect(builder.filtersCountBadge).toHaveText('1');
    await addFilter.click();
    await expect(builder.filterRows()).toHaveCount(2);
    await expect(builder.filtersCountBadge).toHaveText('2');

    await expect(builder.filtersEmptyMessage).toBeHidden();
    const writes = requests
      .since(mark)
      .filter((request) => /^(POST|PUT|DELETE) \/api\/reports/.test(request));
    expect(writes).toEqual([]);
    expect((await listSavedReportsViaApi(page)).body).toEqual(before.body);
    await expect(builder.breadcrumb).toContainText('New report');
  });
});
