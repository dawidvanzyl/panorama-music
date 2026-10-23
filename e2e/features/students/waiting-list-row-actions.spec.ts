import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { fetchStudentById, seedWaitingListEntry } from '../../fixtures/waitingList';
import { actionNames } from '../../fixtures/rowActions';

// Seeding a student needs Teacher; the row actions are a Coordinator's.
const SEED_AND_VIEW_ROLES = ['Teacher', 'Coordinator'] as const;

test.describe('Waiting List — row action verbs', { tag: ['@267IT16'] }, () => {
  test('S1 Enrol, Edit, Remove', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await expect(row).toBeVisible();

    expect(await actionNames(row)).toEqual(['Enrol', 'Edit', 'Remove']);
    await expect(row.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  });

  test('S2 Remove opens the remove confirmation and nothing is removed on the first click', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_VIEW_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await waitingListPage.removeButton(row).click();
    await expect(waitingListPage.deleteConfirmationMessage()).toBeVisible();

    await expect(waitingListPage.deleteConfirmationDeleteButton()).toHaveAccessibleName('Remove');

    await waitingListPage.cancelDelete();
    await page.reload();

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
    expect((await fetchStudentById(page, entry.studentId)).status).toBe(200);
  });

  test('S3 a Teacher only sees no row actions', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Teacher']);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await expect(row).toBeVisible();

    await expect(waitingListPage.readOnlyMarker(row)).toHaveText('Read only');
    await expect(waitingListPage.enrolButton(row)).toHaveCount(0);
    await expect(waitingListPage.editButton(row)).toHaveCount(0);
    await expect(waitingListPage.removeButton(row)).toHaveCount(0);
  });
});
