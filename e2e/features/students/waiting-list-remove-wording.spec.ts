import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry } from '../../fixtures/waitingList';
import { uniqueToken } from '../../fixtures/studentPrint';
import { cancelModal, expectBold, expectDestructiveTemplate } from '../../fixtures/destructiveModal';

test.describe('Remove Student from Waiting List modal — destructive wording', { tag: ['@266IT9'] }, () => {
  test('S1 the remove template names the student and the record', async ({ page }) => {
    const token = uniqueToken();
    const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);
    await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool', lastName: token });
    await page.reload();
    const row = waitingListPage.rowFor('During School', token);

    await waitingListPage.removeButton(row).click();

    const modal = waitingListPage.deleteModal;
    await expectDestructiveTemplate(modal, {
      title: 'Remove Student from Waiting List',
      body: `This action cannot be undone. The student Waiting ${token} will be removed from the waiting list. The student record will also be permanently removed.`,
      confirm: 'Remove',
    });
    await expectBold(modal.locator('#modalName'), `Waiting ${token}`);

    await cancelModal(modal);
    await expect(waitingListPage.rowFor('During School', token)).toBeVisible();
  });
});
