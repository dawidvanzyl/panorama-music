import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry, seedCourseOfType } from '../../fixtures/waitingList';

// Seeding a student needs Teacher (POST /api/students requires
// TeacherPolicy); seeding a course needs Coordinator (POST /api/courses
// requires CoordinatorPolicy). Every scenario below is designed as "Actor:
// Coordinator", and holding Teacher alongside Coordinator does not change
// what the page shows a Coordinator (MAINTAINER_ROLES only checks for
// Coordinator) — so the same signed-in session both seeds and views.
const SEED_AND_VIEW_ROLES = ['Teacher', 'Coordinator'] as const;

test.describe('Waiting List queue order and position follow date-time added', { tag: '@272IT8' }, () => {
  test('orders entries by addedAt, not by insertion order', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);

    // Position is derived from addedAt across every entry in the occurrence
    // type, not scoped to this test's own seeded rows — so these three must
    // be the earliest in the whole group to land on absolute positions one,
    // two and three regardless of what else a parallel run seeds. Twenty
    // years before "now" (rather than "now" plus an offset) guarantees that
    // against anything else's default-NOW() addedAt, while still varying
    // run to run so repeat cycles don't collide with a prior run's rows.
    const base = Date.now() - 20 * 365 * 24 * 60 * 60 * 1000;
    const addedAtOf = (offsetMinutes: number) => new Date(base + offsetMinutes * 60_000).toISOString();

    // Seeded A/B/C, but the intended chronological order is B (T), C (T+1), A (T+2) —
    // insertion order deliberately differs from addedAt order.
    const studentA = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      addedAt: addedAtOf(2),
    });
    const studentB = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      addedAt: addedAtOf(0),
    });
    const studentC = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      addedAt: addedAtOf(1),
    });

    await page.reload();

    const rows = waitingListPage.rows('During School').filter({
      hasText: new RegExp(`${studentA.lastName}|${studentB.lastName}|${studentC.lastName}`),
    });

    await expect(waitingListPage.rowFor('During School', studentB.lastName)).toBeVisible();
    await expect(waitingListPage.position(waitingListPage.rowFor('During School', studentB.lastName))).toHaveText(
      '1',
    );
    await expect(waitingListPage.position(waitingListPage.rowFor('During School', studentC.lastName))).toHaveText(
      '2',
    );
    await expect(waitingListPage.position(waitingListPage.rowFor('During School', studentA.lastName))).toHaveText(
      '3',
    );

    // Order and position both reflect addedAt — confirm the rendered order too.
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText(studentB.lastName);
    await expect(rows.nth(1)).toContainText(studentC.lastName);
    await expect(rows.nth(2)).toContainText(studentA.lastName);
  });
});

test.describe('Collapsing and expanding an occurrence-type list', { tag: '@272IT11' }, () => {
  test('collapsing a list hides its rows', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();

    await waitingListPage.toggleGroup('During School');

    await expect(waitingListPage.rows('During School')).toHaveCount(0);
    await expect(waitingListPage.group('During School')).toBeVisible();
    await expect(waitingListPage.groupHeader('During School')).toHaveAttribute('data-expanded', 'false');
  });

  test('a collapsed list expands again on re-activation', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await waitingListPage.toggleGroup('During School');
    await expect(waitingListPage.rows('During School')).toHaveCount(0);

    await waitingListPage.toggleGroup('During School');

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
  });
});

test.describe('A Teacher gets a read-only Waiting List view', { tag: '@272IT26' }, () => {
  test('no capture action and no row actions are offered; the read-only marker is shown', async ({ page }) => {
    // Teacher alone can seed (POST /api/students only needs TeacherPolicy),
    // and this scenario needs the viewing session to hold *only* Teacher, so
    // it must sign in before seeding rather than combining roles.
    const waitingListPage = await goToWaitingListPage(page, ['Teacher']);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await expect(waitingListPage.captureButton).toBeHidden();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await expect(row).toBeVisible();
    await expect(waitingListPage.readOnlyMarker(row)).toHaveText('Read only');
    await expect(waitingListPage.enrolButton(row)).toHaveCount(0);
    await expect(waitingListPage.editButton(row)).toHaveCount(0);
    await expect(waitingListPage.deleteButton(row)).toHaveCount(0);
  });
});

test.describe('A Coordinator gets the full Waiting List action set', { tag: '@272IT27' }, () => {
  test('the capture action and the enrol, edit and delete row actions are all offered', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await expect(waitingListPage.captureButton).toBeVisible();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await expect(row).toBeVisible();
    await expect(waitingListPage.enrolButton(row)).toBeVisible();
    await expect(waitingListPage.editButton(row)).toBeVisible();
    await expect(waitingListPage.deleteButton(row)).toBeVisible();
    await expect(waitingListPage.readOnlyMarker(row)).toHaveCount(0);
  });
});

test.describe(
  "A row's secondary line reads lesson/duration/instrument before the date added",
  { tag: '@272IT39' },
  () => {
    test('the meta line names lesson type, duration type and instrument type in order, then the date added', async ({
      page,
    }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: 'DuringSchool',
        lessonType: 'Individual',
        durationType: 'Hour',
        instrumentType: 'Guitar',
      });
      await page.reload();

      const row = waitingListPage.rowFor('During School', entry.lastName);
      const metaText = (await waitingListPage.meta(row).textContent())!;

      const lessonIndex = metaText.indexOf('Individual');
      const durationIndex = metaText.indexOf('Hour');
      const instrumentIndex = metaText.indexOf('Guitar');
      const addedIndex = metaText.indexOf('Added');

      expect(lessonIndex).toBeGreaterThanOrEqual(0);
      expect(durationIndex).toBeGreaterThan(lessonIndex);
      expect(instrumentIndex).toBeGreaterThan(durationIndex);
      expect(addedIndex).toBeGreaterThan(instrumentIndex);
    });
  },
);

test.describe('No course type appears on a Waiting List row', { tag: '@272IT40' }, () => {
  test('the row carries no course-type label, even when a course shares its lesson structure', async ({ page }) => {
    // Seeding a course needs Coordinator (POST /api/courses is
    // CoordinatorPolicy), alongside the Teacher this file's seeding always needs.
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);
    // Guitar as the instrument (not Recorder) keeps this check unambiguous —
    // "Grade 2 Recorder" is the leak under test, and the instrument column
    // legitimately shows an instrument name of its own (272IT39).
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Group',
      durationType: 'HalfHour',
      instrumentType: 'Guitar',
    });
    await seedCourseOfType(page, entry.lessonStructureId, 'G2Recorder');
    await page.reload();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    const rowText = (await row.textContent())!;

    expect(rowText).not.toContain('Recorder');
    expect(rowText).not.toContain('G2');
    expect(rowText).not.toContain('Grade 2');
  });
});
