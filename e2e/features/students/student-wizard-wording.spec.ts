import { test, expect } from '../../fixtures/base';
import { goToStudentsPage, goToWaitingListPage } from '../../fixtures/testUsers';
import { expectNoHeaderIcon, expectTitled } from '../../fixtures/modalWording';

function uniqueToken(): string {
  return `Wzd${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

test.describe('Create Student wizard — title and icon', { tag: ['@266IT31'] }, () => {
  test('S1 wording', async ({ page }) => {
    const studentsPage = await goToStudentsPage(page);

    await studentsPage.createButton.click();
    const modal = studentsPage.wizardModal;

    await expectTitled(modal, 'Create Student');
    await expectNoHeaderIcon(modal);
    await expect(modal.locator('.modal__header').getByText('Create Waiting List Entry')).toHaveCount(0);
  });
});

test.describe('Waiting-list capture wizard — title and icon', { tag: ['@266IT32'] }, () => {
  test('S1 wording', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);

    await waitingListPage.openCaptureWizard();
    const modal = waitingListPage.wizardModal;

    await expectTitled(modal, 'Create Waiting List Entry');
    await expectNoHeaderIcon(modal);
    await expect(modal.locator('.modal__header').getByText('Capture Waiting List Student')).toHaveCount(0);
  });

  test('S2 capture still confirms with Create Waiting List Entry', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);

    await waitingListPage.openCaptureWizardAtWaitingListTab({
      firstName: 'Cap',
      lastName: uniqueToken(),
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });

    await expect(
      waitingListPage.wizardModal.getByRole('button', { name: 'Create Waiting List Entry', exact: true }),
    ).toBeVisible();
  });
});
