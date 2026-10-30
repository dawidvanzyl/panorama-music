import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToExtraCurricularsPageAsCoordinator } from '../../fixtures/testUsers';
import { blockRequests, clickBackdropLeftThenAbove, countRequests } from '../../fixtures/modalFrame';
import {
  cancelModal,
  expectBold,
  expectCannotBeUndoneBold,
  expectDestructiveTemplate,
  visibleBody,
} from '../../fixtures/destructiveModal';
import {
  slotText,
  slotsText,
  type ExtraCurricularsPage,
  type PracticeSlot,
} from '../../pages/extra-curriculars/ExtraCurricularsPage';

/**
 * Removing a practice time from a stored activity asks for confirmation in the
 * Remove Practice Time from Activity modal. Every scenario seeds its own
 * activity with two practice times, because the panel refuses to remove the last
 * one before any modal opens.
 */
const MONDAY: PracticeSlot = { day: 'Monday', startTime: '08:00' };
const WEDNESDAY: PracticeSlot = { day: 'Wednesday', startTime: '13:00' };

function uniqueDescription(label: string): string {
  return `e2e ${label} ${Date.now()} ${crypto.randomUUID()}`;
}

interface Seeded {
  activitiesPage: ExtraCurricularsPage;
  description: string;
  activityId: string;
  mondayPath: string;
}

async function seedWithTwoTimes(page: Page, label: string): Promise<Seeded> {
  const description = uniqueDescription(label);
  const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);
  await activitiesPage.createActivity(description, 'Junior', [MONDAY, WEDNESDAY]);
  await expect(activitiesPage.row(description)).toBeVisible();
  const activityId = await activitiesPage.activityId(description);
  await activitiesPage.toggleRow(description);
  const practiceTimeId = await activitiesPage.panelSlotId(activityId, MONDAY);
  return {
    activitiesPage,
    description,
    activityId,
    mondayPath: `/api/extra-curriculars/${activityId}/practice-times/${practiceTimeId}`,
  };
}

async function expectPanelSlots(
  activitiesPage: ExtraCurricularsPage,
  activityId: string,
  ...slots: PracticeSlot[]
): Promise<void> {
  await expect.poll(() => activitiesPage.panelSlots(activityId)).toEqual(slots.map(slotText));
}

test.describe('Extra-Curriculars — Remove Practice Time confirmation wording', { tag: ['@266IT18'] }, () => {
  test('S1 Remove opens the confirmation with the standard wording', async ({ page }) => {
    const { activitiesPage, description, activityId } = await seedWithTwoTimes(page, 'rpt-wording');
    const modal = activitiesPage.removePracticeTimeModal;

    await activitiesPage.removeSlotFromPanel(activityId, MONDAY);

    await expectDestructiveTemplate(modal, {
      title: 'Remove Practice Time from Activity',
      body: `This action cannot be undone. The practice time Monday 08:00 will be removed from the activity ${description}.`,
      confirm: 'Remove',
    });
    await expectCannotBeUndoneBold(modal);
    const strongs = visibleBody(modal).locator('strong');
    await expectBold(strongs.filter({ hasText: 'Monday 08:00' }), 'Monday 08:00');
    await expectBold(strongs.filter({ hasText: description }), description);
    await expect(modal.locator('.modal__card')).toHaveAttribute('role', 'dialog');
    await expect(modal.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  });

  test('S2 opening the confirmation removes nothing', async ({ page }) => {
    const { activitiesPage, activityId, mondayPath } = await seedWithTwoTimes(page, 'rpt-open-only');
    const deletesSent = countRequests(page, 'DELETE', mondayPath);

    await activitiesPage.removeSlotFromPanel(activityId, MONDAY);

    await expect(activitiesPage.removePracticeTimeModal.locator('.modal__card')).toBeVisible();
    expect(deletesSent()).toBe(0);
    await expectPanelSlots(activitiesPage, activityId, MONDAY, WEDNESDAY);
  });

  test('S3 the last practice time is refused without a confirmation', async ({ page }) => {
    const description = uniqueDescription('rpt-last');
    const only: PracticeSlot = { day: 'Thursday', startTime: '11:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);
    await activitiesPage.createActivity(description, 'Junior', [only]);
    await expect(activitiesPage.row(description)).toBeVisible();
    const activityId = await activitiesPage.activityId(description);
    await activitiesPage.toggleRow(description);

    await activitiesPage.removeSlotFromPanel(activityId, only);

    await expect(activitiesPage.panelError(activityId)).toContainText('at least one practice time');
    await expect(activitiesPage.removePracticeTimeModal.locator('.modal__card')).toBeHidden();
    await expectPanelSlots(activitiesPage, activityId, only);
  });
});

test.describe('Extra-Curriculars — confirming a practice time removal', { tag: ['@266IT19'] }, () => {
  test('S1 confirming removes only that practice time, and it stays removed', async ({ page }) => {
    const { activitiesPage, description, activityId, mondayPath } = await seedWithTwoTimes(page, 'rpt-confirm');
    const deletesSent = countRequests(page, 'DELETE', mondayPath);

    await activitiesPage.removeSlotFromPanelAndConfirm(activityId, MONDAY);

    expect(deletesSent()).toBe(1);
    await expectPanelSlots(activitiesPage, activityId, WEDNESDAY);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(slotsText(WEDNESDAY));

    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, WEDNESDAY);
  });

  test('S2 a failed remove shows in the confirmation and keeps it open', async ({ page }) => {
    const { activitiesPage, description, activityId, mondayPath } = await seedWithTwoTimes(page, 'rpt-fail');
    const modal = activitiesPage.removePracticeTimeModal;
    const blocked = await blockRequests(page, 'DELETE', mondayPath);

    await activitiesPage.removeSlotFromPanel(activityId, MONDAY);
    await expect(modal.getByTestId('modal-error')).toHaveText('');
    await modal.getByRole('button', { name: 'Remove', exact: true }).click();

    await expect(modal.getByTestId('modal-error')).toHaveText('Blocked by the spec');
    await expect(modal.locator('.modal__card')).toBeVisible();
    expect(blocked()).toBe(1);

    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, MONDAY, WEDNESDAY);
  });
});

test.describe('Extra-Curriculars — cancelling a practice time removal', { tag: ['@266IT20'] }, () => {
  test('S1 Cancel closes and removes nothing', async ({ page }) => {
    const { activitiesPage, description, activityId, mondayPath } = await seedWithTwoTimes(page, 'rpt-cancel');
    const deletesSent = countRequests(page, 'DELETE', mondayPath);

    await activitiesPage.removeSlotFromPanel(activityId, MONDAY);
    await cancelModal(activitiesPage.removePracticeTimeModal);

    expect(deletesSent()).toBe(0);
    await expectPanelSlots(activitiesPage, activityId, MONDAY, WEDNESDAY);

    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, MONDAY, WEDNESDAY);
  });

  test('S2 the close control does the same as Cancel', async ({ page }) => {
    const { activitiesPage, description, activityId, mondayPath } = await seedWithTwoTimes(page, 'rpt-close');
    const modal = activitiesPage.removePracticeTimeModal;
    const deletesSent = countRequests(page, 'DELETE', mondayPath);

    await activitiesPage.removeSlotFromPanel(activityId, MONDAY);
    await modal.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(modal.locator('.modal__card')).toBeHidden();

    expect(deletesSent()).toBe(0);
    await expectPanelSlots(activitiesPage, activityId, MONDAY, WEDNESDAY);

    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, MONDAY, WEDNESDAY);
  });
});

test.describe('Extra-Curriculars — the practice time confirmation ignores backdrop and keys', { tag: ['@266IT46'] }, () => {
  test('S1 backdrop clicks and Escape leave the confirmation open', async ({ page }) => {
    const { activitiesPage, activityId, mondayPath } = await seedWithTwoTimes(page, 'rpt-backdrop');
    const card = activitiesPage.removePracticeTimeModal.locator('.modal__card');
    const deletesSent = countRequests(page, 'DELETE', mondayPath);

    await activitiesPage.removeSlotFromPanel(activityId, MONDAY);
    await clickBackdropLeftThenAbove(page, card, async () => {
      await expect(card).toBeVisible();
    });
    await page.keyboard.press('Escape');
    await expect(card).toBeVisible();

    expect(deletesSent()).toBe(0);
    await expectPanelSlots(activitiesPage, activityId, MONDAY, WEDNESDAY);
  });

  test('S2 the confirmation still works after the backdrop clicks and Escape', async ({ page }) => {
    const { activitiesPage, activityId } = await seedWithTwoTimes(page, 'rpt-backdrop-then');
    const card = activitiesPage.removePracticeTimeModal.locator('.modal__card');

    await activitiesPage.removeSlotFromPanel(activityId, MONDAY);
    await clickBackdropLeftThenAbove(page, card, async () => {
      await expect(card).toBeVisible();
    });
    await page.keyboard.press('Escape');
    await expect(card).toBeVisible();
    await activitiesPage.confirmRemovePracticeTime();

    await expectPanelSlots(activitiesPage, activityId, WEDNESDAY);
  });
});
