import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToExtraCurricularsPageAsCoordinator } from '../../fixtures/testUsers';
import { seedListedActivity } from '../../fixtures/studentPrint';
import { cancelModal, expectBold, expectDestructiveTemplate } from '../../fixtures/destructiveModal';

/** A description without the words Recorder or practice, so it never satisfies the wording itself. */
function uniqueDescription(): string {
  return `e2e wording ${Date.now()} ${crypto.randomUUID().slice(0, 8)}`;
}

async function openDeleteModal(page: Page, practiceTimes: { day: string; startTime: string }[]) {
  const description = uniqueDescription();
  const extraCurricularsPage = await goToExtraCurricularsPageAsCoordinator(page);
  await seedListedActivity(page, { description, phase: 'Junior', practiceTimes });
  await page.reload();
  await expect(extraCurricularsPage.row(description)).toBeVisible();

  await extraCurricularsPage.clickDelete(description);
  return { description, extraCurricularsPage };
}

test.describe('Delete Activity modal — destructive wording', { tag: ['@266IT8'] }, () => {
  test('S1 two practice times are named as a side effect', async ({ page }) => {
    const { description, extraCurricularsPage } = await openDeleteModal(page, [
      { day: 'Monday', startTime: '15:00' },
      { day: 'Thursday', startTime: '15:00' },
    ]);

    const modal = extraCurricularsPage.deleteModal;
    await expectDestructiveTemplate(modal, {
      title: 'Delete Activity',
      body: `This action cannot be undone. The activity ${description} will be permanently removed. Its 2 practice times will also be permanently removed.`,
      confirm: 'Delete',
    });
    await expectBold(extraCurricularsPage.deleteModalName(), description);

    await cancelModal(modal);
    await expect(extraCurricularsPage.row(description)).toBeVisible();
  });

  test('S2 one practice time reads in the singular', async ({ page }) => {
    const { description, extraCurricularsPage } = await openDeleteModal(page, [
      { day: 'Tuesday', startTime: '15:00' },
    ]);

    const modal = extraCurricularsPage.deleteModal;
    await expectDestructiveTemplate(modal, {
      title: 'Delete Activity',
      body: `This action cannot be undone. The activity ${description} will be permanently removed. Its 1 practice time will also be permanently removed.`,
      confirm: 'Delete',
    });

    await cancelModal(modal);
    await expect(extraCurricularsPage.row(description)).toBeVisible();
  });
});
