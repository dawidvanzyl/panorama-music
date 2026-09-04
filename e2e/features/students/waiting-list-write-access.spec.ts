import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import {
  seedWaitingListEntry,
  attemptUpdateWaitingListEntry,
  attemptUpdateWaitingListStudent,
  attemptRemoveWaitingListStudent,
  fetchStudentById,
  fetchWaitingListEntry,
} from '../../fixtures/waitingList';

/**
 * A Teacher is offered no Edit and no Delete on a Waiting List row at all
 * (272IT26), so each attempt below is a direct request from the signed-in
 * session — the same way waiting-list-capture.spec.ts reaches 272IT29's
 * boundary. A Teacher alone can still seed: POST /api/students is
 * TeacherPolicy and the entry row is inserted directly.
 */
const TEACHER_ONLY = ['Teacher'] as const;

test.describe("A Teacher's edit and removal attempts on the waiting list are refused", { tag: '@272IT30' }, () => {
  test("the entry's own fields cannot be changed", async ({ page }) => {
    await goToWaitingListPage(page, [...TEACHER_ONLY]);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      instrumentType: 'Piano',
      notes: 'Seeded note',
    });

    const status = await attemptUpdateWaitingListEntry(page, entry.waitingListEntryId, {
      lessonStructureId: entry.lessonStructureId,
      instrumentType: 'Guitar',
      notes: 'Changed by a Teacher',
    });

    expect(status).toBe(403);

    const unchanged = await fetchWaitingListEntry(page, entry.waitingListEntryId);
    expect(unchanged).not.toBeNull();
    expect(unchanged!.instrumentType).toBe('Piano');
    expect(unchanged!.notes).toBe('Seeded note');
  });

  test("the student's own details cannot be changed", async ({ page }) => {
    await goToWaitingListPage(page, [...TEACHER_ONLY]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });

    const status = await attemptUpdateWaitingListStudent(page, entry.studentId, 'Renamed', entry.lastName);

    expect(status).toBe(403);

    const student = await fetchStudentById(page, entry.studentId);
    expect(student.status).toBe(200);
    expect(student.firstName).toBe(entry.firstName);
  });

  test('the student cannot be removed from the waiting list', async ({ page }) => {
    await goToWaitingListPage(page, [...TEACHER_ONLY]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });

    const status = await attemptRemoveWaitingListStudent(page, entry.studentId);

    expect(status).toBe(403);

    expect(await fetchWaitingListEntry(page, entry.waitingListEntryId)).not.toBeNull();
    expect((await fetchStudentById(page, entry.studentId)).status).toBe(200);
  });
});
