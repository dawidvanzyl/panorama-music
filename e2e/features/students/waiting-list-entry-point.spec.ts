import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';

test.describe(
  'Entry points — the Waiting List page offers "Create Waiting List Entry"',
  { tag: ['@267IT37'] },
  () => {
    test('a Coordinator sees the entry point', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
      await expect(page.getByRole('heading', { name: 'Waiting List' })).toBeVisible();

      const entryPoint = page.getByRole('button', { name: 'Create Waiting List Entry', exact: true });
      await expect(entryPoint).toBeVisible();
      await expect(page.getByRole('button', { name: 'Capture Student', exact: true })).toHaveCount(0);

      await entryPoint.click();

      await expect(waitingListPage.wizardModal).toHaveAttribute('open', '');
    });

    test('a Teacher is not offered it', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, ['Teacher']);
      await expect(page.getByRole('heading', { name: 'Waiting List' })).toBeVisible();

      await expect(waitingListPage.captureButton).toBeHidden();
      await expect(page.getByRole('button', { name: 'Create Waiting List Entry', exact: true })).toHaveCount(0);
    });
  },
);
