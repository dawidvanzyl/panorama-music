import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry, seedCourseOfType } from '../../fixtures/waitingList';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import { truncateWaitingList, waitingListEntryExists } from '../../fixtures/db';

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
 *  4. 272IT16 — truncate again, seed a single entry, enrol it away, and
 *     assert the list it was under stops being rendered. That an occurrence
 *     type renders at all is a property of the whole table, so this scenario
 *     belongs here rather than alongside the other enrolment specs.
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

  test('shows a During School list and an After School list, each labelled with its own count', async ({ page }) => {
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

test.describe('Enrolling the last row under an occurrence type takes its list with it', { tag: '@272IT16' }, () => {
  test.beforeAll(async () => {
    // The assertion below is that a list stops being rendered, which only
    // means anything if this scenario's entry is the only one in the table.
    await truncateWaitingList();
  });

  test('the After School list is no longer rendered and the empty state stands in its place', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'AfterSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    const courseId = await seedCourseOfType(page, entry.lessonStructureId, 'G2Recorder');
    await page.reload();

    await expect(waitingListPage.group('After School')).toBeVisible();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('After School', entry.lastName));
    await waitingListPage.enrolCourse().selectOption(courseId);
    await waitingListPage.chooseEnrolTeacher(target.teacherName);
    await waitingListPage.confirmEnrol();

    await expect(waitingListPage.enrolModal).not.toHaveAttribute('open');
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

    // Not rendered empty — not rendered at all, with the empty state standing
    // in place of both lists now the table holds nothing.
    await expect(waitingListPage.group('After School')).toBeHidden();
    await expect(waitingListPage.group('During School')).toBeHidden();
    await expect(waitingListPage.emptyState).toBeVisible();
  });
});
