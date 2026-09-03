import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry, seedCourseOfType } from '../../fixtures/waitingList';

test.describe('Waiting List groups by occurrence type, each with its own count', { tag: '@272IT7' }, () => {
  test('shows a During School list and an After School list, each labelled with its own count', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);

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

test.describe('Waiting List queue order and position follow date-time added', { tag: '@272IT8' }, () => {
  test('orders entries by addedAt, not by insertion order', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);

    const base = Date.now();
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
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();

    await waitingListPage.toggleGroup('During School');

    await expect(waitingListPage.rows('During School')).toHaveCount(0);
    await expect(waitingListPage.group('During School')).toBeVisible();
    await expect(waitingListPage.groupHeader('During School')).toHaveAttribute('data-expanded', 'false');
  });

  test('a collapsed list expands again on re-activation', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
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
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    const waitingListPage = await goToWaitingListPage(page, ['Teacher']);
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
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
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
      const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
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
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
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
