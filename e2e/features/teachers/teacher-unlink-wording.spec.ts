import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { createRegisteredUser, goToTeachersPage, uniqueTestEmail } from '../../fixtures/testUsers';
import { uniqueTeacherName } from '../../fixtures/teachers';
import { countRequests } from '../../fixtures/modalFrame';
import { cancelModal, expectBold, visibleBody } from '../../fixtures/destructiveModal';
import { expectReversibleTemplate } from '../../fixtures/reversibleModal';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';

const PASSWORD = 'ReversibleUnlink123!';

async function openLinkedTeacher(
  page: Page,
  accountLabel: string,
  teacherLabel: string,
): Promise<{ email: string; teacherId: string; detail: TeacherDetailPage }> {
  const email = uniqueTestEmail(accountLabel);
  await createRegisteredUser(page, email, PASSWORD, ['Teacher']);
  const teachersPage = await goToTeachersPage(page);
  const { firstName, surname } = uniqueTeacherName(teacherLabel);
  await teachersPage.createTeacher({ firstName, surname, linkedAccountEmail: email });
  await teachersPage.openTeacher(`${firstName} ${surname}`);
  await page.waitForURL(/#\/teachers\/[^/?#]+$/);
  const teacherId = new URL(page.url()).hash.split('/').pop()!;
  const detail = new TeacherDetailPage(page);
  await expect(detail.accountBadge).toContainText(email);
  return { email, teacherId, detail };
}

test.describe('Unlink Account modal — reversible look', { tag: ['@266IT24'] }, () => {
  test('S1 the Unlink Account modal has the reversible look and wording', async ({ page }) => {
    const { email, teacherId, detail } = await openLinkedTeacher(page, 'rev-acct', 'rev-link');
    const unlinksSent = countRequests(page, 'DELETE', `/api/teachers/${teacherId}/account`);

    await detail.unlinkButton.click();

    await expectReversibleTemplate(detail.unlinkModal, {
      title: 'Unlink Account',
      body: `${email} will be unlinked from this teacher. The teacher loses self-service access to this profile and its banking details. The teacher record and the account's Teacher role stay. You can link it again later.`,
      confirm: 'Unlink',
    });
    await expectBold(visibleBody(detail.unlinkModal).locator('strong'), email);

    await cancelModal(detail.unlinkModal);
    expect(unlinksSent()).toBe(0);
    await expect(detail.accountBadge).toContainText(email);
  });

  test('S2 the primary Unlink still unlinks, and the account can be linked again', async ({ page }) => {
    const { email, detail } = await openLinkedTeacher(page, 'rev-acct-relink', 'rev-link-undo');

    await detail.unlinkButton.click();
    await detail.unlinkModal.getByRole('button', { name: 'Unlink', exact: true }).click();

    await expect(detail.unlinkModal.locator('.modal__card')).toBeHidden();
    await expect(detail.accountBadge).toContainText('No login account');
    await expect(detail.linkButton).toBeVisible();

    await page.reload();
    await expect(detail.accountBadge).toContainText('No login account');

    await detail.linkAccount(email);
    await expect(detail.accountBadge).toContainText(email);
  });
});
