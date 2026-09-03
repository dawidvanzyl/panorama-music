import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry } from '../../fixtures/waitingList';
import { truncateWaitingList } from '../../fixtures/db';

/**
 * Every scenario in this file needs the whole `WaitingList` table under its
 * own control at read time — a cost the design flags explicitly for 272IT9
 * and 272IT10 (see e2e-design.md's isolation notes for S3/S4), because the
 * page gives no filter or scoping control that could fake "empty" (or an
 * exact count) against a shared, parallel-populated database. 272IT7 turned
 * out to need the same treatment: its "labelled with a count of one
 * waiting"/"count of two waiting" assertions are exact counts over the
 * *whole* occurrence type (`GetWaitingListHandler` counts every row in the
 * group, not just the ones this test seeded), so the design's own "parallel-
 * safe" isolation note for that scenario does not hold up under a shared
 * database — the same gap the design already named for S3/S4, just not
 * caught there. See qa-run-1.md for the fuller note to the tech lead.
 *
 * This file runs in its own `waiting-list-empty-state` Playwright project
 * (see playwright.config.ts), `fullyParallel: false` and `describe.configure
 * ({ mode: 'serial' })` below, so its tests never race each other. Order
 * within the file matters and each scenario re-truncates for itself rather
 * than trusting a prior scenario's leftovers:
 *
 *  1. 272IT10 — the table is empty (from this file's own beforeAll); assert
 *     the empty state.
 *  2. 272IT9 — seed During School only; assert After School is still absent
 *     (it truly holds zero rows at this point).
 *  3. 272IT7 — truncate again for a table this scenario fully controls, seed
 *     exactly one During School entry and two After School entries, and
 *     assert the exact counts the design specifies.
 */
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await truncateWaitingList();
});

test.describe('The empty state replaces both lists when no entries exist at all', { tag: '@272IT10' }, () => {
  test('neither list is shown; a single empty-state message is shown in their place', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);

    await expect(waitingListPage.group('During School')).toBeHidden();
    await expect(waitingListPage.group('After School')).toBeHidden();
    await expect(waitingListPage.emptyState).toBeVisible();
    await expect(waitingListPage.emptyState).toHaveText('No students are currently on the waiting list.');
  });
});

test.describe('An occurrence type with no waiting students renders no list for it', { tag: '@272IT9' }, () => {
  test('the empty occurrence type is omitted, not shown empty', async ({ page }) => {
    // Seeding a student needs Teacher (POST /api/students is TeacherPolicy),
    // alongside the Coordinator role this scenario is designed around.
    const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await expect(waitingListPage.group('During School')).toBeVisible();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
    await expect(waitingListPage.group('After School')).toBeHidden();
  });
});

test.describe('Waiting List groups by occurrence type, each with its own count', { tag: '@272IT7' }, () => {
  test.beforeAll(async () => {
    // 272IT9 above leaves a During School entry behind; this scenario's
    // exact-count assertions need a table it fully controls, not one shared
    // with the previous scenario's leftovers.
    await truncateWaitingList();
  });

  test('shows a During School list and an After School list, each labelled with its own count', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);

    const duringSchool = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    const afterSchoolOne = await seedWaitingListEntry(page, { occurrenceType: 'AfterSchool' });
    const afterSchoolTwo = await seedWaitingListEntry(page, { occurrenceType: 'AfterSchool' });

    await page.reload();

    await expect(waitingListPage.group('During School')).toBeVisible();
    await expect(waitingListPage.groupCount('During School')).toHaveText('· 1 waiting');
    await expect(waitingListPage.rowFor('During School', duringSchool.lastName)).toBeVisible();

    await expect(waitingListPage.group('After School')).toBeVisible();
    await expect(waitingListPage.groupCount('After School')).toHaveText('· 2 waiting');
    await expect(waitingListPage.rowFor('After School', afterSchoolOne.lastName)).toBeVisible();
    await expect(waitingListPage.rowFor('After School', afterSchoolTwo.lastName)).toBeVisible();
  });
});
