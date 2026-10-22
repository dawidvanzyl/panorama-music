import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToExtraCurricularsPageAsCoordinator } from '../../fixtures/testUsers';
import { seedActivity } from '../../fixtures/extraCurriculars';
import type { ExtraCurricularsPage } from '../../pages/extra-curriculars/ExtraCurricularsPage';

function uniqueDescription(): string {
  return `E2E-PT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Seeds an activity with one Monday 07:15 slot, reloads the catalogue and opens the activity's panel. */
async function openPanel(page: Page): Promise<{
  activitiesPage: ExtraCurricularsPage;
  activityId: string;
  description: string;
}> {
  const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);
  const description = uniqueDescription();
  const { extraCurricularId } = await seedActivity(page, {
    description,
    phase: 'Junior',
    practiceTimes: [{ day: 'Monday', startTime: '07:15' }],
  });

  await activitiesPage.reloadExtraCurriculars();
  await activitiesPage.toggleRow(description);
  await expect(activitiesPage.panelHeading(extraCurricularId)).toBeVisible();
  return { activitiesPage, activityId: extraCurricularId, description };
}

test.describe(
  'Form labels — the practice-time panel confirms with "Create Practice Time"',
  { tag: ['@267IT22'] },
  () => {
    test('the panel confirms with "Create Practice Time"', async ({ page }) => {
      const { activitiesPage, activityId } = await openPanel(page);

      const panel = activitiesPage.panel(activityId);
      await expect(panel.getByRole('button', { name: 'Create Practice Time', exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
    });

    test('the relabelled action still creates the practice time', async ({ page }) => {
      const { activitiesPage, activityId, description } = await openPanel(page);

      await activitiesPage.panelDaySelect(activityId).selectOption({ label: 'Wednesday' });
      await activitiesPage.panelStartTimeInput(activityId).fill('14:30');
      await activitiesPage
        .panel(activityId)
        .getByRole('button', { name: 'Create Practice Time', exact: true })
        .click();
      await expect.poll(() => activitiesPage.panelSlots(activityId)).toContain('Wednesday 14:30');

      await activitiesPage.reloadExtraCurriculars();
      await activitiesPage.toggleRow(description);
      await expect
        .poll(() => activitiesPage.panelSlots(activityId))
        .toEqual(['Monday 07:15', 'Wednesday 14:30']);
    });
  },
);
