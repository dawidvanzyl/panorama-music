import type { Page } from '@playwright/test';
import { expect } from './base';
import { insertWaitingListEntry } from './db';

export type OccurrenceType = 'DuringSchool' | 'AfterSchool';
export type LessonType = 'Individual' | 'Group';
export type DurationType = 'Hour' | 'HalfHour';
export type InstrumentType = 'Piano' | 'Guitar' | 'Recorder' | 'Keyboard' | 'Voice' | 'Other';

export interface SeedWaitingListEntryOptions {
  occurrenceType: OccurrenceType;
  /** Narrows the lesson-structure lookup; omit to accept the first match for the occurrence type. */
  lessonType?: LessonType;
  durationType?: DurationType;
  instrumentType?: InstrumentType;
  notes?: string | null;
  /** ISO date-time. Omit to let the row default to NOW(). */
  addedAt?: string;
}

export interface SeededWaitingListEntry {
  waitingListEntryId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  lessonStructureId: string;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
  instrumentType: InstrumentType;
}

/**
 * Seeds one waiting-list entry the way the design's fixture note prescribes:
 * the student is created through the real `/api/students` POST (so it is a
 * real, addressable record), the lesson structure is read back from
 * `/api/lesson-structures` the same way `seedEnrollmentTarget` does, and the
 * `WaitingList` row is inserted directly against Postgres because no capture
 * endpoint exists yet (#293). Requests go through `page.evaluate` so they
 * carry the signed-in caller's bearer token.
 */
export async function seedWaitingListEntry(
  page: Page,
  options: SeedWaitingListEntryOptions,
): Promise<SeededWaitingListEntry> {
  const surname = `Waiting-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const instrumentType = options.instrumentType ?? 'Piano';

  const seeded = await page.evaluate(
    async ({ surname, occurrenceType, lessonType, durationType }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };

      const studentResponse = await fetch('/api/students', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: 'Waiting',
          lastName: surname,
          dateOfBirth: '2013-03-01',
          grade: 'Grade4',
          class: 'A1',
          phase: 'Junior',
          language: 'English',
        }),
      });
      const student = (await studentResponse.json()) as {
        studentId: string;
        firstName: string;
        lastName: string;
      };

      const structuresResponse = await fetch('/api/lesson-structures', { headers });
      const structures = (await structuresResponse.json()) as {
        lessonStructureId: string;
        lessonType: string;
        durationType: string;
        occurrenceType: string;
      }[];
      const structure = structures.find(
        (s) =>
          s.occurrenceType === occurrenceType &&
          (lessonType === undefined || s.lessonType === lessonType) &&
          (durationType === undefined || s.durationType === durationType),
      );

      return {
        studentStatus: studentResponse.status,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        lessonStructureId: structure?.lessonStructureId ?? null,
        lessonType: structure?.lessonType ?? null,
        durationType: structure?.durationType ?? null,
      };
    },
    {
      surname,
      occurrenceType: options.occurrenceType,
      lessonType: options.lessonType,
      durationType: options.durationType,
    },
  );

  expect(seeded.studentStatus).toBe(201);
  expect(seeded.lessonStructureId, 'a lesson structure matching the requested filter must exist').not.toBeNull();

  const waitingListEntryId = await insertWaitingListEntry({
    studentId: seeded.studentId,
    lessonStructureId: seeded.lessonStructureId!,
    instrumentType,
    notes: options.notes ?? null,
    addedAt: options.addedAt,
  });

  return {
    waitingListEntryId,
    studentId: seeded.studentId,
    firstName: seeded.firstName,
    lastName: seeded.lastName,
    lessonStructureId: seeded.lessonStructureId!,
    lessonType: seeded.lessonType as LessonType,
    durationType: seeded.durationType as DurationType,
    occurrenceType: options.occurrenceType,
    instrumentType,
  };
}

export interface CaptureAttemptOptions {
  /** The lesson-structure id to submit — real or, for 272IT5, one that names nothing seeded. */
  lessonStructureId: string;
  instrumentType?: InstrumentType;
  notes?: string | null;
}

export interface CaptureAttemptResult {
  status: number;
  /** The unique surname submitted, so the caller can confirm no such student exists afterwards. */
  lastName: string;
}

/**
 * Issues a direct POST to the capture endpoint (`/api/waiting-list`) from the
 * signed-in session, for the two design scenarios the wizard's own controls
 * cannot reach (see the design's conventions note): 272IT5 (S5), a
 * lesson-structure reference that does not exist — every real
 * occurrence/lesson/duration triple is offered by the wizard, so this
 * boundary can only be produced by naming a bad id directly — and 272IT29
 * (S8), a Teacher, who the Waiting List page never offers a Capture Student
 * action to in the first place. Mirrors `seedWaitingListEntry`'s own
 * `page.evaluate`-carries-the-bearer-token pattern.
 */
export async function attemptCaptureWaitingListStudent(
  page: Page,
  options: CaptureAttemptOptions,
): Promise<CaptureAttemptResult> {
  const surname = `WaitingCapture-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const instrumentType = options.instrumentType ?? 'Piano';

  const status = await page.evaluate(
    async ({ surname, lessonStructureId, instrumentType, notes }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };
      const response = await fetch('/api/waiting-list', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: 'Waiting',
          lastName: surname,
          dateOfBirth: '2013-03-01',
          grade: 'Grade4',
          class: 'A1',
          phase: 'Junior',
          language: 'English',
          lessonStructureId,
          instrumentType,
          notes: notes ?? null,
        }),
      });
      return response.status;
    },
    { surname, lessonStructureId: options.lessonStructureId, instrumentType, notes: options.notes },
  );

  return { status, lastName: surname };
}

/**
 * Reads back one real lesson-structure id from the signed-in session — Teacher
 * and Coordinator can both read `/api/lesson-structures` — for a capture
 * attempt (272IT29/S8) that must be refused on role alone, not on an
 * incidentally-invalid lesson structure.
 */
export async function fetchAnyLessonStructureId(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` };
    const response = await fetch('/api/lesson-structures', { headers });
    const structures = (await response.json()) as { lessonStructureId: string }[];
    return structures[0].lessonStructureId;
  });
}

/**
 * Creates a course of the given type on the given lesson structure, through
 * the real `/api/courses` POST — used only to prove a course-type leak would
 * be observable (272IT40, S14), never to enrol the seeded waiting-list
 * student in it.
 */
export async function seedCourseOfType(page: Page, lessonStructureId: string, courseType: string): Promise<string> {
  const cost = `${Date.now() % 100_000_000}.00`;

  const created = await page.evaluate(
    async ({ lessonStructureId, courseType, cost }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers,
        body: JSON.stringify({ courseType, cost, lessonStructureId }),
      });
      const course = (await response.json()) as { courseId: string };
      return { status: response.status, courseId: course.courseId };
    },
    { lessonStructureId, courseType, cost },
  );

  expect(created.status).toBe(201);
  return created.courseId;
}
