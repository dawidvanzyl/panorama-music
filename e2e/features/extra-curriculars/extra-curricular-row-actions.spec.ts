import { test, expect } from '../../fixtures/base';
import { goToExtraCurricularsPageAsCoordinator } from '../../fixtures/testUsers';
import { type Page } from '@playwright/test';

/**
 * Editing and deleting an activity from its row (#278), and the description
 * uniqueness rule it introduces alongside them. The create and read halves of
 * `10IT1` are proven by #275 in `extra-curricular-management.spec.ts`; every
 * scenario here works against an activity that is already stored.
 *
 * An activity's description is free text, so a per-run unique one is what keeps
 * these scenarios independent under parallel workers. No scenario asserts a
 * total row count or a globally empty table — rows are scoped to their own
 * unique description.
 */
function uniqueDescription(label: string): string {
  return `e2e ${label} ${Date.now()} ${crypto.randomUUID()}`;
}

/**
 * Issues a create request directly against the activities endpoint, bypassing
 * the form — from inside the page, so it carries the signed-in Coordinator's
 * own session, following the existing `postCreateFromPage`-style helper
 * pattern `extra-curricular-management.spec.ts` already uses.
 */
async function postCreateFromPage(
  page: Page,
  body: { description: string; phase: string; practiceTimes: { day: string; startTime: string }[] },
): Promise<number> {
  return page.evaluate(async (payload) => {
    const response = await fetch('/api/extra-curriculars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      },
      body: JSON.stringify(payload),
    });
    return response.status;
  }, body);
}

/** Issues a request from inside the page, so it carries the signed-in caller's bearer token. */
async function fetchFromPage(page: Page, method: string, path: string): Promise<number> {
  return page.evaluate(
    async ({ method, path }: { method: string; path: string }) => {
      const response = await fetch(path, {
        method,
        headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
      });
      return response.status;
    },
    { method, path },
  );
}

test.describe('Extra-Curriculars — updating and deleting an activity', { tag: ['@10IT1'] }, () => {
  test("updating an activity's description and phase completes and persists, leaving its practice times untouched", async ({
    page,
  }) => {
    const description = uniqueDescription('Marimba Band');
    const updatedDescription = uniqueDescription('Marimba Ensemble');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.createActivity(description, 'Junior', [{ day: 'Monday', startTime: '15:00' }]);
    await expect(activitiesPage.row(description)).toBeVisible();
    const activityId = await activitiesPage.activityId(description);

    await activitiesPage.editRow(description);
    await activitiesPage.fillRowEdit(activityId, { description: updatedDescription, phase: 'Senior' });
    await activitiesPage.saveRowEdit(activityId);

    // Back to its read state, with the new description and phase — and the
    // practice time an edit never touches.
    const updatedRow = activitiesPage.row(updatedDescription);
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText('Senior');
    await expect(activitiesPage.practiceTimesCell(updatedRow)).toHaveText('Monday 15:00');
    await expect(activitiesPage.row(description)).toHaveCount(0);

    // Persisted, not merely reflected in client state.
    await activitiesPage.reloadExtraCurriculars();
    const reloaded = activitiesPage.row(updatedDescription);
    await expect(reloaded).toBeVisible();
    await expect(reloaded).toContainText('Senior');
    await expect(activitiesPage.practiceTimesCell(reloaded)).toHaveText('Monday 15:00');
  });

  test('deleting an activity with no assigned students completes and persists', async ({ page }) => {
    const description = uniqueDescription('Recorder Group');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.createActivity(description, 'Junior', [{ day: 'Tuesday', startTime: '15:00' }]);
    await expect(activitiesPage.row(description)).toBeVisible();

    await activitiesPage.clickDelete(description);
    await activitiesPage.confirmDelete();

    await expect(activitiesPage.row(description)).toHaveCount(0);

    // Persisted, not merely reflected in client state.
    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.row(description)).toHaveCount(0);
  });
});

test.describe('Extra-Curriculars — deleting an activity leaves no orphaned practice times', { tag: ['@10IT9'] }, () => {
  test('deleting an activity with several practice times leaves none of them behind', async ({ page }) => {
    const description = uniqueDescription('Recorder Ensemble');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.createActivity(description, 'Junior', [
      { day: 'Monday', startTime: '15:00' },
      { day: 'Thursday', startTime: '15:00' },
    ]);
    await expect(activitiesPage.row(description)).toBeVisible();
    const activityId = await activitiesPage.activityId(description);

    // Captured before the deletion — the panel's own identifier for one of the
    // activity's slots, the same one its own Remove would send to the endpoint.
    await activitiesPage.toggleRow(description);
    const practiceTimeId = await activitiesPage.panelSlotId(activityId, { day: 'Monday', startTime: '15:00' });

    await activitiesPage.clickDelete(description);
    await activitiesPage.confirmDelete();
    await expect(activitiesPage.row(description)).toHaveCount(0);

    // Not merely hidden by the activity's absence — it does not exist to be
    // acted on, the same "no orphan" proof
    // `extra-curricular-practice-times.spec.ts` already uses for a
    // removed-then-repeated deletion.
    const status = await fetchFromPage(
      page,
      'DELETE',
      `/api/extra-curriculars/${activityId}/practice-times/${practiceTimeId}`,
    );
    expect(status).toBe(404);

    // Neither the activity nor any of its practice times survive under a
    // description search — a reload re-reads the catalogue from storage.
    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.row(description)).toHaveCount(0);
  });
});

test.describe(
  "Extra-Curriculars — an activity's description is unique within its phase",
  { tag: ['@10IT13'] },
  () => {
    test('a duplicate description in the same phase is refused; the same description in the other phase is created', async ({
      page,
    }) => {
      const description = uniqueDescription('Choir');
      const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

      await activitiesPage.createActivity(description, 'Junior', [{ day: 'Monday', startTime: '15:00' }]);
      await expect(activitiesPage.row(description)).toBeVisible();

      // A second Junior activity with the same description is refused, naming
      // the phase and the description — R14's own wording.
      await activitiesPage.enterActivity(description, 'Junior');
      await activitiesPage.stageSlot({ day: 'Tuesday', startTime: '10:00' });
      await activitiesPage.submit();

      await expect(activitiesPage.formError()).toHaveText(`Junior already has an activity called "${description}".`);
      await expect(activitiesPage.row(description, 'Junior')).toHaveCount(1);

      await activitiesPage.reloadExtraCurriculars();
      await expect(activitiesPage.row(description, 'Junior')).toHaveCount(1);

      // The same description in the other phase is a legitimately different
      // activity, and is created.
      await activitiesPage.createActivity(description, 'Senior', [{ day: 'Wednesday', startTime: '11:00' }]);
      await expect(activitiesPage.row(description, 'Senior')).toBeVisible();
      await expect(activitiesPage.row(description, 'Junior')).toHaveCount(1);

      await activitiesPage.reloadExtraCurriculars();
      await expect(activitiesPage.row(description, 'Senior')).toHaveCount(1);
      await expect(activitiesPage.row(description, 'Junior')).toHaveCount(1);
    });

    test('the refusal holds even when the client-side guard is bypassed', async ({ page }) => {
      const description = uniqueDescription('Choir2');
      const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

      await activitiesPage.createActivity(description, 'Junior', [{ day: 'Wednesday', startTime: '14:00' }]);
      await expect(activitiesPage.row(description)).toBeVisible();

      // The form's guard is client-side; a rule enforced only in the browser is
      // not enforced.
      const status = await postCreateFromPage(page, {
        description,
        phase: 'Junior',
        practiceTimes: [{ day: 'Thursday', startTime: '09:00' }],
      });
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(500);

      // The refused request wrote nothing.
      await activitiesPage.filterByDescription(description);
      await expect(activitiesPage.row(description, 'Junior')).toHaveCount(1);

      await activitiesPage.reloadExtraCurriculars();
      await activitiesPage.filterByDescription(description);
      await expect(activitiesPage.row(description, 'Junior')).toHaveCount(1);
    });
  },
);
