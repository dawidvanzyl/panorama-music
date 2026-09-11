import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry, fetchStudentById } from '../../fixtures/waitingList';

// Seeding a student needs Teacher (POST /api/students is TeacherPolicy) while
// removal is a Coordinator's; one session holds both.
const SEED_AND_REMOVE_ROLES = ['Teacher', 'Coordinator'] as const;

test.describe('Removing a waiting-list row asks for confirmation first', { tag: '@272IT20' }, () => {
  test('the confirmation names the student and says their student record will be deleted', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_REMOVE_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await waitingListPage.openDeleteConfirmation(row);

    await expect(waitingListPage.deleteConfirmationMessage()).toContainText(`${entry.firstName} ${entry.lastName}`);
    await expect(waitingListPage.deleteConfirmationMessage()).toContainText('delete their student record');

    // Nothing has happened yet — the row and the record are both still there.
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
    expect((await fetchStudentById(page, entry.studentId)).status).toBe(200);
  });
});

test.describe('Cancelling the removal confirmation deletes nothing', { tag: '@272IT21' }, () => {
  test('the row stays on the waiting list and no removal message is shown', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_REMOVE_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await waitingListPage.openDeleteConfirmation(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.cancelDelete();

    await expect(waitingListPage.deleteConfirmationMessage()).toBeHidden();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
    await expect(waitingListPage.successBanner).toBeHidden();
    expect((await fetchStudentById(page, entry.studentId)).status).toBe(200);
  });
});

test.describe('Confirming the removal takes the row and the student record with it', { tag: '@272IT22' }, () => {
  test('the row leaves the waiting list, a message names the removed student, and their record is gone', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_REMOVE_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await waitingListPage.openDeleteConfirmation(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.confirmDelete();

    await expect(waitingListPage.successBanner).toContainText(`${entry.firstName} ${entry.lastName}`);
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);
    await expect(waitingListPage.rowFor('After School', entry.lastName)).toHaveCount(0);

    // The record itself, which the screen has no way to show once its row is
    // gone: read directly by the id this test seeded, and nothing else.
    expect((await fetchStudentById(page, entry.studentId)).status).toBe(404);
  });
});
