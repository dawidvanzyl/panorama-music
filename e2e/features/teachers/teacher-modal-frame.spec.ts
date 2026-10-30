import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToTeachersPageAsBankingCoordinator } from '../../fixtures/testUsers';
import { signInAsLinkedTeacher } from '../../fixtures/teachers';
import { MyDetailsPage } from '../../pages/teachers/MyDetailsPage';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

const BANKING = {
  bank: 'StandardBank',
  accountType: 'Savings',
  branchCode: '051001',
  accountNumber: '1234567890',
};

function uniqueToken(): string {
  return `Mfr${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

function closeControl(modal: Locator): Locator {
  return modal.getByRole('button', { name: 'Close', exact: true });
}

test.describe('My Details modal — close control', { tag: ['@266IT37'] }, () => {
  test('close dismisses My Details', async ({ page }) => {
    await signInAsLinkedTeacher(page, 'frame-close');
    const myDetails = new MyDetailsPage(page);
    await myDetails.open();
    const card = myDetails.modal.locator('.modal__card');
    await expect(myDetails.modal.locator('.modal__header').getByRole('button', { name: 'Close', exact: true })).toHaveCount(1);

    await closeControl(myDetails.modal).click();

    await expect(card).toBeHidden();
    await expect(page).toHaveURL(/#\/(?!login)/);
    await expect(myDetails.accountChip).toBeVisible();
  });

  test('close during an unsaved profile edit saves nothing', async ({ page }) => {
    const { firstName } = await signInAsLinkedTeacher(page, 'frame-edit');
    const renamed = `Renamed${uniqueToken()}`;
    const myDetails = new MyDetailsPage(page);
    await myDetails.open();

    await myDetails.editButton.click();
    await myDetails.editForm.locator('#firstName').fill(renamed);
    await closeControl(myDetails.modal).click();
    await expect(myDetails.modal.locator('.modal__card')).toBeHidden();

    await myDetails.open();
    await expect(myDetails.firstName()).toHaveText(firstName);
    await expect(myDetails.editForm).toBeHidden();

    await page.reload();
    await myDetails.open();
    await expect(myDetails.firstName()).toHaveText(firstName);
  });
});

test.describe('Banking Activity modal — close control only', { tag: ['@266IT38'] }, () => {
  async function openActivityModal(page: Page): Promise<TeacherDetailPage> {
    const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
    const firstName = 'E2E-frame-activity';
    const surname = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await expect(teachersPage.row(fullName)).toBeVisible();
    await teachersPage.openTeacher(fullName);
    await page.waitForURL(/#\/teachers\/[^/?#]+$/);

    const detail = new TeacherDetailPage(page);
    await detail.captureBankingDetails(BANKING);
    await detail.bankingActivityButton.click();
    await expect(detail.bankingActivityModal.locator('.modal__card')).toBeVisible();
    return detail;
  }

  test('the only way out is the close control', async ({ page }) => {
    const detail = await openActivityModal(page);
    const modal = detail.bankingActivityModal;

    await expect(detail.bankingActivityRows.first()).toBeVisible();
    await expect(modal.getByRole('button')).toHaveCount(1);
    await expect(modal.locator('.modal__header').getByRole('button', { name: 'Close', exact: true })).toHaveCount(1);
    await expect(modal.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
  });

  test('the close control closes it', async ({ page }) => {
    const detail = await openActivityModal(page);
    await detail.bankingRevealButton.waitFor({ state: 'visible' });
    const accountNumber = await detail.bankingAccountNumber.textContent();

    await closeControl(detail.bankingActivityModal).click();

    await expect(detail.bankingActivityModal.locator('.modal__card')).toBeHidden();
    await expect(detail.header).toBeVisible();
    await expect(detail.bankingAccountNumber).toHaveText(accountNumber ?? '');
  });

  test('the same modal opened from My Details', async ({ page }) => {
    await signInAsLinkedTeacher(page, 'frame-own-activity');
    const myDetails = new MyDetailsPage(page);
    await myDetails.open();
    await myDetails.captureBankingDetails({
      bank: 'Nedbank',
      accountType: 'Savings',
      branchCode: '198765',
      accountNumber: '1122334455',
    });

    await myDetails.bankingActivityButton.click();
    const activity = myDetails.bankingActivityModal;
    await expect(activity.locator('.modal__card')).toBeVisible();
    await expect(activity.getByRole('button')).toHaveCount(1);
    await expect(activity.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);

    await closeControl(activity).click();

    await expect(activity.locator('.modal__card')).toBeHidden();
    await expect(myDetails.modal.locator('.modal__card')).toBeVisible();
  });
});
