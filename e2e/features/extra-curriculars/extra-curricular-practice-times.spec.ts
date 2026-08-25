import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToExtraCurricularsPageAsCoordinator } from '../../fixtures/testUsers';
import {
  slotText,
  slotsText,
  type ExtraCurricularsPage,
  type PracticeSlot,
} from '../../pages/extra-curriculars/ExtraCurricularsPage';

/**
 * Maintaining the practice times of an activity that already exists, from the
 * expandable row. The create half of `10IT5`, `10IT7` and `10IT8` is proven by
 * #275 in `extra-curricular-management.spec.ts`; every scenario here works
 * against an activity that is already stored.
 *
 * An activity's description is free text, so a per-run unique one is what keeps
 * these scenarios independent under parallel workers. No scenario asserts a
 * total row count or a globally empty table, and slots are asserted per
 * activity — the same day and start time may legitimately be held by another
 * worker's activity.
 */
function uniqueDescription(label: string): string {
  return `e2e ${label} ${Date.now()} ${crypto.randomUUID()}`;
}

/**
 * Creates an activity through the create form — the seeding mechanism for this
 * story, already proven by #275 — and returns its own identifier.
 */
async function seedActivity(
  activitiesPage: ExtraCurricularsPage,
  description: string,
  phase: 'Junior' | 'Senior',
  slots: PracticeSlot[],
): Promise<string> {
  await activitiesPage.createActivity(description, phase, slots);
  await expect(activitiesPage.row(description)).toBeVisible();
  return activitiesPage.activityId(description);
}

/**
 * Issues a request from inside the page, so it carries the signed-in user's
 * bearer token — `page.request` would send none and prove only the anonymous
 * case.
 */
async function fetchFromPage(page: Page, method: string, path: string, body?: unknown): Promise<number> {
  return page.evaluate(
    async ({ method, path, body }: { method: string; path: string; body?: unknown }) => {
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return response.status;
    },
    { method, path, body },
  );
}

/** Asserts the panel lists exactly these slots, in exactly this order. */
async function expectPanelSlots(
  activitiesPage: ExtraCurricularsPage,
  activityId: string,
  ...slots: PracticeSlot[]
): Promise<void> {
  await expect
    .poll(() => activitiesPage.panelSlots(activityId))
    .toEqual(slots.map(slotText));
}

test.describe('Extra-Curriculars — slots added to an existing activity', { tag: ['@10IT5'] }, () => {
  test('persists slots added through the panel and shows them together in order', async ({ page }) => {
    const description = uniqueDescription('panel-add-order');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    // A late-in-the-week opening slot, so slots added afterwards must sort
    // before it and a naive append-to-end ordering fails.
    const friday: PracticeSlot = { day: 'Friday', startTime: '14:00' };
    const mondayLate: PracticeSlot = { day: 'Monday', startTime: '16:00' };
    const mondayEarly: PracticeSlot = { day: 'Monday', startTime: '09:15' };
    const activityId = await seedActivity(activitiesPage, description, 'Junior', [friday]);

    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, friday);

    await activitiesPage.addSlotFromPanel(activityId, mondayLate);
    await expectPanelSlots(activitiesPage, activityId, mondayLate, friday);

    await activitiesPage.addSlotFromPanel(activityId, mondayEarly);
    await expectPanelSlots(activitiesPage, activityId, mondayEarly, mondayLate, friday);

    // A panel that updates only itself and leaves the summary stale fails here.
    const expected = slotsText(mondayEarly, mondayLate, friday);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(expected);

    // Persisted against that one activity, not merely reflected in client state.
    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, mondayEarly, mondayLate, friday);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(expected);
  });

  test('shows the slots of the activity the panel belongs to, and closes on collapse', async ({ page }) => {
    const token = uniqueDescription('panel-identity');
    const marimba = `${token} Marimba Band`;
    const recorder = `${token} Recorder Group`;
    const marimbaSlot: PracticeSlot = { day: 'Monday', startTime: '15:00' };
    const recorderSlot: PracticeSlot = { day: 'Tuesday', startTime: '15:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const marimbaId = await seedActivity(activitiesPage, marimba, 'Junior', [marimbaSlot]);
    const recorderId = await seedActivity(activitiesPage, recorder, 'Senior', [recorderSlot]);

    await activitiesPage.toggleRow(marimba);
    await expect(activitiesPage.panelHeading(marimbaId)).toHaveText(`Practice Times — ${marimba}`);
    await expectPanelSlots(activitiesPage, marimbaId, marimbaSlot);
    await expect(activitiesPage.isRowExpanded(marimba)).resolves.toBe('true');

    await activitiesPage.toggleRow(recorder);
    await expect(activitiesPage.panelHeading(recorderId)).toHaveText(`Practice Times — ${recorder}`);
    await expectPanelSlots(activitiesPage, recorderId, recorderSlot);

    await activitiesPage.toggleRow(recorder);

    // Closing a panel closes that panel. Whether panels are exclusive is not
    // asserted — neither the issue nor the mockup states it.
    await expect(activitiesPage.panel(recorderId)).toHaveCount(0);
    // The expander's own state says the row is collapsed, rather than it being
    // inferred purely from the panel's absence.
    await expect(activitiesPage.isRowExpanded(recorder)).resolves.toBe('false');
  });
});

test.describe('Extra-Curriculars — removing one of an activity’s slots', { tag: ['@10IT6'] }, () => {
  test('removes only the targeted slot and leaves the others unchanged', async ({ page }) => {
    const description = uniqueDescription('remove-middle');
    const monday: PracticeSlot = { day: 'Monday', startTime: '15:00' };
    const tuesday: PracticeSlot = { day: 'Tuesday', startTime: '15:00' };
    const thursday: PracticeSlot = { day: 'Thursday', startTime: '15:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Senior', [monday, tuesday, thursday]);

    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, monday, tuesday, thursday);

    // The middle one: an off-by-one that removes by index rather than by
    // identity takes out a neighbour, and is invisible at either end.
    await activitiesPage.removeSlotFromPanel(activityId, tuesday);

    await expectPanelSlots(activitiesPage, activityId, monday, thursday);
    const expected = slotsText(monday, thursday);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(expected);

    // A removal that only hid the row fails here.
    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, monday, thursday);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(expected);
  });

  test('leaves another activity’s identical slot alone', async ({ page }) => {
    const token = uniqueDescription('remove-identity');
    const alpha = `${token} Alpha`;
    const beta = `${token} Beta`;
    // Both legitimately hold Wednesday 13:00 — uniqueness is scoped to one activity.
    const shared: PracticeSlot = { day: 'Wednesday', startTime: '13:00' };
    const alphaOwn: PracticeSlot = { day: 'Monday', startTime: '08:00' };
    const betaOwn: PracticeSlot = { day: 'Friday', startTime: '08:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const alphaId = await seedActivity(activitiesPage, alpha, 'Junior', [shared, alphaOwn]);
    const betaId = await seedActivity(activitiesPage, beta, 'Senior', [shared, betaOwn]);

    await activitiesPage.toggleRow(alpha);
    await activitiesPage.removeSlotFromPanel(alphaId, shared);
    await expectPanelSlots(activitiesPage, alphaId, alphaOwn);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(alpha))).toHaveText(slotsText(alphaOwn));

    // A removal written against the day-and-time pair rather than the slot's own
    // identity deletes Beta's slot too, which the scenario above cannot detect.
    await activitiesPage.toggleRow(beta);
    await expectPanelSlots(activitiesPage, betaId, shared, betaOwn);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(beta))).toHaveText(slotsText(shared, betaOwn));

    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(alpha))).toHaveText(slotsText(alphaOwn));
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(beta))).toHaveText(slotsText(shared, betaOwn));
  });

  test('reports a slot that no longer exists as not found, and changes nothing', async ({ page }) => {
    const description = uniqueDescription('remove-twice');
    const first: PracticeSlot = { day: 'Monday', startTime: '10:00' };
    const second: PracticeSlot = { day: 'Monday', startTime: '11:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Junior', [first, second]);

    await activitiesPage.toggleRow(description);
    // The identifier the panel's own Remove sends to the endpoint.
    const practiceTimeId = await activitiesPage.panelSlotId(activityId, second);
    await activitiesPage.removeSlotFromPanel(activityId, second);
    await expectPanelSlots(activitiesPage, activityId, first);

    const status = await fetchFromPage(
      page,
      'DELETE',
      `/api/extra-curriculars/${activityId}/practice-times/${practiceTimeId}`,
    );
    expect(status).toBe(404);

    // The refusal left the surviving slot alone rather than cascading.
    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, first);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(slotsText(first));
  });
});

test.describe('Extra-Curriculars — a duplicate slot on a stored activity', { tag: ['@10IT7'] }, () => {
  test('refuses a day and start time the activity already holds, and stores nothing', async ({ page }) => {
    const description = uniqueDescription('panel-duplicate');
    const monday: PracticeSlot = { day: 'Monday', startTime: '15:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Junior', [monday]);

    await activitiesPage.toggleRow(description);
    await activitiesPage.addSlotFromPanel(activityId, monday);

    // The mockup's copy is a requirement, so the whole string is asserted.
    await expect(activitiesPage.panelErrorBanner(activityId)).toBeVisible();
    await expect(activitiesPage.panelError(activityId)).toHaveText(
      'Monday 15:00 is already a practice time for this activity.',
    );

    // Both add controls take their error state, per screen 02.
    await expect(activitiesPage.panelDaySelect(activityId)).toHaveClass(/ec-panel__select--error/);
    await expect(activitiesPage.panelStartTimeInput(activityId)).toHaveClass(/ec-panel__time--error/);

    await expectPanelSlots(activitiesPage, activityId, monday);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(slotText(monday));

    // A guard that shows the banner and posts anyway fails here and nowhere else.
    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, monday);
  });

  test('accepts the same day at a different start time', async ({ page }) => {
    const description = uniqueDescription('panel-same-day');
    const monday: PracticeSlot = { day: 'Monday', startTime: '15:00' };
    const later: PracticeSlot = { day: 'Monday', startTime: '16:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Junior', [monday]);

    await activitiesPage.toggleRow(description);
    await activitiesPage.addSlotFromPanel(activityId, later);

    // The boundary that stops the guard being written as "one slot per day".
    await expectPanelSlots(activitiesPage, activityId, monday, later);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(
      slotsText(monday, later),
    );
  });

  test('still accepts that day and start time on a different activity', async ({ page }) => {
    const token = uniqueDescription('panel-duplicate-scope');
    const holder = `${token} Holder`;
    const other = `${token} Other`;
    const shared: PracticeSlot = { day: 'Wednesday', startTime: '12:00' };
    const otherOwn: PracticeSlot = { day: 'Friday', startTime: '12:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const holderId = await seedActivity(activitiesPage, holder, 'Junior', [shared]);
    const otherId = await seedActivity(activitiesPage, other, 'Senior', [otherOwn]);

    await activitiesPage.toggleRow(other);
    await activitiesPage.addSlotFromPanel(otherId, shared);

    // A guard written as a catalogue-wide unique index fails only here.
    await expect(activitiesPage.panelErrorBanner(otherId)).toBeHidden();
    await expectPanelSlots(activitiesPage, otherId, shared, otherOwn);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(other))).toHaveText(
      slotsText(shared, otherOwn),
    );

    await activitiesPage.toggleRow(holder);
    await expectPanelSlots(activitiesPage, holderId, shared);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(holder))).toHaveText(slotText(shared));
  });

  test('refuses a duplicate at the endpoint, with nothing left persisted', async ({ page }) => {
    const description = uniqueDescription('panel-duplicate-endpoint');
    const tuesday: PracticeSlot = { day: 'Tuesday', startTime: '09:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Junior', [tuesday]);

    // The panel's guard is client-side; a rule enforced only in the browser is
    // not enforced.
    const status = await fetchFromPage(page, 'POST', `/api/extra-curriculars/${activityId}/practice-times`, tuesday);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);

    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, tuesday);
  });
});

test.describe('Extra-Curriculars — an activity may not be left with no slots', { tag: ['@10IT8'] }, () => {
  test('refuses the removal of the only remaining slot, and keeps it', async ({ page }) => {
    const description = uniqueDescription('last-slot');
    const only: PracticeSlot = { day: 'Thursday', startTime: '11:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Junior', [only]);

    await activitiesPage.toggleRow(description);
    await activitiesPage.removeSlotFromPanel(activityId, only);

    // The design does not fix this banner's copy the way it fixes the
    // duplicate's, so the rule it names is what is asserted.
    await expect(activitiesPage.panelErrorBanner(activityId)).toBeVisible();
    await expect(activitiesPage.panelError(activityId)).toContainText('at least one practice time');

    await expectPanelSlots(activitiesPage, activityId, only);
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(slotText(only));

    // Not a UI-only message over a completed delete.
    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, only);
  });

  test('refuses the surviving slot as soon as it is the last, without a reload', async ({ page }) => {
    const description = uniqueDescription('becomes-last-slot');
    const first: PracticeSlot = { day: 'Monday', startTime: '07:00' };
    const second: PracticeSlot = { day: 'Monday', startTime: '08:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Junior', [first, second]);

    await activitiesPage.toggleRow(description);
    await activitiesPage.removeSlotFromPanel(activityId, second);
    await expectPanelSlots(activitiesPage, activityId, first);

    // A guard evaluated once at page load, against the count the panel was
    // rendered with, passes the scenario above and empties the activity here.
    await activitiesPage.removeSlotFromPanel(activityId, first);

    await expect(activitiesPage.panelErrorBanner(activityId)).toBeVisible();
    await expect(activitiesPage.panelError(activityId)).toContainText('at least one practice time');
    await expectPanelSlots(activitiesPage, activityId, first);
  });

  test('refuses the last-slot removal at the endpoint', async ({ page }) => {
    const description = uniqueDescription('last-slot-endpoint');
    const only: PracticeSlot = { day: 'Saturday', startTime: '09:00' };
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const activityId = await seedActivity(activitiesPage, description, 'Junior', [only]);

    await activitiesPage.toggleRow(description);
    const practiceTimeId = await activitiesPage.panelSlotId(activityId, only);

    // The panel may withhold Remove on a last slot, in which case the screen
    // scenarios prove nothing about the rule — this is what keeps the criterion
    // covered under either implementation choice.
    const status = await fetchFromPage(
      page,
      'DELETE',
      `/api/extra-curriculars/${activityId}/practice-times/${practiceTimeId}`,
    );
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);

    await activitiesPage.reloadExtraCurriculars();
    await activitiesPage.toggleRow(description);
    await expectPanelSlots(activitiesPage, activityId, only);
  });
});
