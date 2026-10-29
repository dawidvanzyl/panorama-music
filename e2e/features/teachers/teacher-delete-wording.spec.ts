import { test, expect } from '../../fixtures/base';
import { goToTeachersPageAsBankingCoordinator } from '../../fixtures/testUsers';
import { deactivateTeacher, uniqueTeacherName, waitForTeacherInactive } from '../../fixtures/teachers';
import { seedNamedTeacher } from '../../fixtures/studentPrint';
import { cancelModal, expectBold, expectDestructiveTemplate } from '../../fixtures/destructiveModal';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

const BANKING = {
  bank: 'StandardBank',
  accountType: 'Savings',
  branchCode: '051001',
  accountNumber: '1234567890',
};
const LAST4 = '7890';

test.describe('Delete Teacher modal — destructive wording', { tag: ['@266IT1'] }, () => {
  test('S1 the Delete Teacher modal has the destructive wording', async ({ page }) => {
    const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
    const { firstName, surname } = uniqueTeacherName('wording');
    const fullName = `${firstName} ${surname}`;
    const { teacherId } = await seedNamedTeacher(page, firstName, surname);
    await deactivateTeacher(page, teacherId);
    await waitForTeacherInactive(page, teacherId);
    await page.reload();

    await teachersPage.openTeacher(fullName);
    await page.waitForURL(/#\/teachers\/[^/?#]+$/);
    const detail = new TeacherDetailPage(page);
    await detail.deleteButton.click();

    await expectDestructiveTemplate(detail.deleteModal, {
      title: 'Delete Teacher',
      body: `This action cannot be undone. The teacher ${fullName} will be permanently removed.`,
      confirm: 'Delete',
    });
    await expectBold(detail.deleteModal.locator('#modalName'), fullName);

    await cancelModal(detail.deleteModal);
    await expect(detail.deleteButton).toBeVisible();
    await expect(page).toHaveURL(/#\/teachers\/[^/?#]+$/);
  });
});

test.describe('Delete Banking Details modal — destructive wording', { tag: ['@266IT2'] }, () => {
  test('S1 the Delete Banking Details modal names the last four digits', async ({ page }) => {
    const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
    const { firstName, surname } = uniqueTeacherName('wording-bank');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await expect(teachersPage.row(fullName)).toBeVisible();
    await teachersPage.openTeacher(fullName);
    await page.waitForURL(/#\/teachers\/[^/?#]+$/);
    const detail = new TeacherDetailPage(page);
    await detail.captureBankingDetails(BANKING);

    await detail.bankingDeleteButton.click();

    await expectDestructiveTemplate(detail.bankingDeleteModal, {
      title: 'Delete Banking Details',
      body: `This action cannot be undone. The banking details ending ${LAST4} will be permanently removed.`,
      confirm: 'Delete',
    });
    await expectBold(detail.bankingDeleteModal.locator('strong:has(#modalLast4)'), `ending ${LAST4}`);

    await cancelModal(detail.bankingDeleteModal);
    await expect(detail.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);
  });
});
