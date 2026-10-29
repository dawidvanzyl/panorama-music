import { test, expect } from '../../fixtures/base';
import { goToTeachersPageAsBankingCoordinator } from '../../fixtures/testUsers';
import { signInAsLinkedTeacher } from '../../fixtures/teachers';
import { expectNoHeaderIcon, expectTitled, actionButtonNames } from '../../fixtures/modalWording';
import { MyDetailsPage } from '../../pages/teachers/MyDetailsPage';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

test.describe('My Details modal — title and icon', { tag: ['@266IT29'] }, () => {
  test('S1 wording', async ({ page }) => {
    await signInAsLinkedTeacher(page, 'details-wording');
    const myDetails = new MyDetailsPage(page);
    await myDetails.open();
    const modal = myDetails.modal;

    await expectTitled(modal, 'My Details');
    await expectNoHeaderIcon(modal);
    await expect(modal.locator('.modal__header').getByRole('button', { name: 'Close', exact: true })).toHaveCount(1);
    expect(await actionButtonNames(modal.locator('.modal__header'))).toEqual([]);
  });
});

test.describe('Banking Activity modal — title and icon', { tag: ['@266IT30'] }, () => {
  test('S1 wording from the teacher detail page', async ({ page }) => {
    const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
    const firstName = 'E2E-activity-wording';
    const surname = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(`${firstName} ${surname}`);
    await page.waitForURL(/#\/teachers\/[^/?#]+$/);
    const detail = new TeacherDetailPage(page);
    await detail.captureBankingDetails({
      bank: 'StandardBank',
      accountType: 'Savings',
      branchCode: '051001',
      accountNumber: '1234567890',
    });

    await detail.bankingActivityButton.click();
    const modal = detail.bankingActivityModal;
    await expect(modal.locator('.modal__card')).toBeVisible();
    await expect(detail.bankingActivityRows.first()).toBeVisible();

    await expectTitled(modal, 'Banking Activity');
    await expectNoHeaderIcon(modal);
  });
});
