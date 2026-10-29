import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToTeachersPageAsBankingCoordinator } from '../../fixtures/testUsers';
import { uniqueTeacherName } from '../../fixtures/teachers';
import {
  cancelModal,
  expectBold,
  expectCannotBeUndoneBold,
  expectDestructiveTemplate,
} from '../../fixtures/destructiveModal';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

const BANKING = {
  bank: 'StandardBank',
  accountType: 'Savings',
  branchCode: '051001',
  accountNumber: '1234567890',
};
const LAST4 = '7890';
const DEACTIVATE_PATH = /^\/api\/teachers\/[^/]+\/deactivate$/;

function countDeactivateRequests(page: Page): () => number {
  let sent = 0;
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && DEACTIVATE_PATH.test(new URL(request.url()).pathname)) sent += 1;
  });
  return () => sent;
}

test.describe('Deactivate Teacher modal — destructive look', { tag: ['@266IT12'] }, () => {
  test('S1 the Deactivate Teacher modal has the destructive look', async ({ page }) => {
    const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
    const { firstName, surname } = uniqueTeacherName('deact');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(fullName);
    await page.waitForURL(/#\/teachers\/[^/?#]+$/);
    const detail = new TeacherDetailPage(page);
    await expect(detail.statusChip).toHaveText('Active');
    const deactivatesSent = countDeactivateRequests(page);

    await detail.deactivateButton.click();

    await expectDestructiveTemplate(detail.deactivateModal, {
      title: 'Deactivate Teacher',
      body: /^This action cannot be undone\./,
      confirm: 'Deactivate',
    });
    await expectCannotBeUndoneBold(detail.deactivateModal);
    await expectBold(detail.deactivateModal.locator('#modalName'), fullName);

    await cancelModal(detail.deactivateModal);
    expect(deactivatesSent()).toBe(0);
    await expect(detail.statusChip).toHaveText('Active');
  });
});

test.describe('Deactivate Teacher modal — banking details wording', { tag: ['@266IT47'] }, () => {
  test('S1 the body names the banking details and the full consequence', async ({ page }) => {
    const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
    const { firstName, surname } = uniqueTeacherName('deact-bank');
    const fullName = `${firstName} ${surname}`;
    await teachersPage.createTeacher({ firstName, surname });
    await teachersPage.openTeacher(fullName);
    await page.waitForURL(/#\/teachers\/[^/?#]+$/);
    const detail = new TeacherDetailPage(page);
    await detail.captureBankingDetails(BANKING);
    await expect(detail.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);
    const deactivatesSent = countDeactivateRequests(page);

    await detail.deactivateButton.click();

    await expectDestructiveTemplate(detail.deactivateModal, {
      title: 'Deactivate Teacher',
      body: `This action cannot be undone. The teacher ${fullName} will be deactivated and removed from active selection lists. Their banking details will be permanently removed. The teacher record and its history are kept.`,
      confirm: 'Deactivate',
    });
    await expect(detail.deactivateModal.locator('.modal__body')).not.toContainText('Are you sure');
    await expect(
      detail.deactivateModal.getByRole('button', { name: 'Deactivate', exact: true }),
    ).toHaveCount(1);

    await cancelModal(detail.deactivateModal);
    expect(deactivatesSent()).toBe(0);
    await expect(detail.statusChip).toHaveText('Active');
    await expect(detail.bankingAccountNumber).toHaveText(`•••• •••• ${LAST4}`);
  });
});
