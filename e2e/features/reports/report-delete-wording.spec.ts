import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import { saveReportViaApi } from '../../fixtures/reports';
import { uniqueToken } from '../../fixtures/studentPrint';
import { cancelModal, expectBold, expectDestructiveTemplate } from '../../fixtures/destructiveModal';
import { ReportsPage } from '../../pages/reports/ReportsPage';
import { DeleteReportModal } from '../../pages/reports/DeleteReportModal';

test.describe('Delete Report modal — destructive wording', { tag: ['@266IT11'] }, () => {
  test('S1 the Delete Report modal has the delete template and no icon circle', async ({ page }) => {
    const name = `${uniqueToken()} Wording`;
    await loginAsRoles(page, ['Teacher']);
    const saved = await saveReportViaApi(page, {
      name,
      definition: { filters: [], columns: ['student.name'] },
    });
    expect(saved.status).toBe(201);

    const reportsPage = new ReportsPage(page);
    await reportsPage.gotoReports();
    await reportsPage.waitForLoaded();
    await reportsPage.requestDelete(reportsPage.rowByName(name));

    const deleteModal = new DeleteReportModal(page);
    await deleteModal.waitForOpen();
    const modal = deleteModal.host;
    await expectDestructiveTemplate(modal, {
      title: 'Delete Report',
      body: `This action cannot be undone. The report ${name} will be permanently removed.`,
      confirm: 'Delete',
    });
    await expectBold(deleteModal.name, name);
    await expect(modal.locator('.modal__icon-circle')).toHaveCount(0);
    await expect(modal.locator('.modal__header > *')).toHaveCount(3);

    await cancelModal(modal);
    await expect(reportsPage.rowByName(name)).toBeVisible();
  });
});
