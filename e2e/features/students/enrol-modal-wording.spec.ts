import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry, ensureInstrumentCourse } from '../../fixtures/waitingList';
import { expectCancelThenConfirm, expectNoHeaderIcon, expectTitled } from '../../fixtures/modalWording';

test.describe('Enrol Student modal — title, icon and confirm label', { tag: ['@266IT28'] }, () => {
  test('S1 wording', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    await ensureInstrumentCourse(page, entry.lessonStructureId);
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));
    const modal = waitingListPage.enrolModal;

    await expectTitled(modal, 'Enrol Student');
    await expectNoHeaderIcon(modal);
    await expectCancelThenConfirm(modal, 'Enrol Student');
    await expect(modal.getByRole('button', { name: 'Enrol', exact: true })).toHaveCount(0);
  });
});
