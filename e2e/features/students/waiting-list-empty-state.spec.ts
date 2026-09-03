import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry } from '../../fixtures/waitingList';
import { truncateWaitingList } from '../../fixtures/db';

/**
 * Both scenarios in this file need the whole `WaitingList` table clean at
 * read time — a cost the design flags explicitly (see the isolation notes
 * for S3/S4 in e2e-design.md), because the page gives no filter or scoping
 * control that could fake "empty" against a shared, parallel-populated
 * database. This file runs in its own `waiting-list-empty-state` Playwright
 * project (see playwright.config.ts), which `dependencies` on the main
 * `chromium` project so it only starts once every other spec — including the
 * rest of this story's own — has finished writing to the table, and
 * `fullyParallel: false` keeps its two tests from racing each other.
 *
 * Order matters within the file: the empty-state scenario (272IT10) runs
 * first against a freshly truncated table with nothing seeded, then the
 * omitted-occurrence-type scenario (272IT9) seeds only During School —
 * leaving After School still at zero for its own check.
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
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await expect(waitingListPage.group('During School')).toBeVisible();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
    await expect(waitingListPage.group('After School')).toBeHidden();
  });
});
