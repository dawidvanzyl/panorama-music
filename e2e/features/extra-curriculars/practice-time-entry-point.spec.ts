import { test, expect } from '../../fixtures/base';
import { goToExtraCurricularsPageAsCoordinator } from '../../fixtures/testUsers';
import { trackApiRequests } from '../../fixtures/studentPrint';

test.describe(
  'Entry points — the extra-curricular form offers "Create Practice Time"',
  { tag: ['@267IT38'] },
  () => {
    test('the entry point reads "Create Practice Time"', async ({ page }) => {
      const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);
      await expect(activitiesPage.activityForm).toBeVisible();

      await expect(
        activitiesPage.activityForm.getByRole('button', { name: 'Create Practice Time', exact: true }),
      ).toBeVisible();
      await expect(
        activitiesPage.activityForm.getByRole('button', { name: 'Add Practice Time', exact: true }),
      ).toHaveCount(0);
    });

    test('it still stages a slot and sends nothing', async ({ page }) => {
      const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);
      const requests = trackApiRequests(page);
      const mark = requests.mark();
      const form = activitiesPage.activityForm;
      const slot = { day: 'Tuesday', startTime: '13:45' } as const;

      await form.locator('#day').selectOption({ label: slot.day });
      await form.locator('#startTime').fill(slot.startTime);
      await form.getByRole('button', { name: 'Create Practice Time', exact: true }).click();

      await expect(activitiesPage.chip(slot)).toBeVisible();
      await expect(form.getByText('No practice times added.')).toBeHidden();
      expect(requests.since(mark).filter((request) => request.includes('/api/extra-curriculars'))).toEqual([]);
    });
  },
);
