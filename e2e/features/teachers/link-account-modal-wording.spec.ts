import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser, goToTeachersPage } from '../../fixtures/testUsers';
import { expectCancelThenConfirm, expectNoHeaderIcon, expectTitled } from '../../fixtures/modalWording';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

const PASSWORD = 'TeacherLinkPass123!';

async function openLinkModal(page: Page, accountEmail: string): Promise<TeacherDetailPage> {
  await createRegisteredUser(page, accountEmail, PASSWORD, ['Teacher']);
  const teachersPage = await goToTeachersPage(page);
  const firstName = 'E2E-linkw';
  const surname = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await teachersPage.createTeacher({ firstName, surname });
  await teachersPage.openTeacher(`${firstName} ${surname}`);
  const detail = new TeacherDetailPage(page);
  await detail.linkButton.click();
  await expect(detail.linkModal.locator('.modal__card')).toBeVisible();
  return detail;
}

test.describe('Link Account modal — title, icon and confirm label', { tag: ['@266IT27'] }, () => {
  test('S1 wording', async ({ page }) => {
    const detail = await openLinkModal(page, uniqueTestEmail('link-wording'));
    const modal = detail.linkModal;

    await expectTitled(modal, 'Link Account');
    await expectNoHeaderIcon(modal);
    await expectCancelThenConfirm(modal, 'Link Account');
    await expect(modal.getByText('Link a login account')).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Link account', exact: true })).toHaveCount(0);
  });

  test('S2 the renamed confirm still links the account', async ({ page }) => {
    const email = uniqueTestEmail('link-wording-confirm');
    const detail = await openLinkModal(page, email);

    await detail.accountPicker.selectOption({ label: email });
    await detail.linkModal.getByRole('button', { name: 'Link Account', exact: true }).click();

    await expect(detail.linkModal.locator('.modal__card')).toBeHidden();
    await page.reload();
    await expect(detail.accountBadge).toContainText(email);
  });
});
