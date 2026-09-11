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
  /**
   * A family surname to create this student under, for a scenario that needs
   * one waiting-list student and one enrolled student in the same family so a
   * listing can be read scoped to it. Omit and the seeder mints its own unique
   * surname as before. The first name stays `Waiting`, which is what tells this
   * student apart from an enrolled sibling sharing the surname.
   */
  lastName?: string;
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
  const surname = options.lastName ?? `Waiting-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
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
 * The three write surfaces this story exposes, reached directly from the
 * signed-in session. A Teacher is offered no Edit and no Delete on the page at
 * all (272IT26), so the refusal boundary has no UI path to attempt it through
 * — the same reasoning `attemptCaptureWaitingListStudent` follows for capture.
 */
export interface EntryUpdateAttempt {
  lessonStructureId: string;
  instrumentType: InstrumentType;
  notes: string | null;
}

export async function attemptUpdateWaitingListEntry(
  page: Page,
  waitingListEntryId: string,
  input: EntryUpdateAttempt,
): Promise<number> {
  return page.evaluate(
    async ({ waitingListEntryId, input }) => {
      const response = await fetch(`/api/waiting-list/${waitingListEntryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify(input),
      });
      return response.status;
    },
    { waitingListEntryId, input },
  );
}

export async function attemptUpdateWaitingListStudent(
  page: Page,
  studentId: string,
  firstName: string,
  lastName: string,
): Promise<number> {
  return page.evaluate(
    async ({ studentId, firstName, lastName }) => {
      const response = await fetch(`/api/waiting-list/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          dateOfBirth: '2013-03-01',
          grade: 'Grade4',
          class: 'A1',
          phase: 'Junior',
          language: 'English',
        }),
      });
      return response.status;
    },
    { studentId, firstName, lastName },
  );
}

export async function attemptRemoveWaitingListStudent(page: Page, studentId: string): Promise<number> {
  return page.evaluate(async (studentId) => {
    const response = await fetch(`/api/waiting-list/students/${studentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    return response.status;
  }, studentId);
}

export interface StudentReadResult {
  status: number;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Reads one student back by id — for the checks a screen cannot show: that a
 * removed student's record is really gone, and that a refused write left the
 * record it named untouched.
 */
export async function fetchStudentById(page: Page, studentId: string): Promise<StudentReadResult> {
  return page.evaluate(async (studentId) => {
    const response = await fetch(`/api/students/${studentId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    if (!response.ok) return { status: response.status, firstName: null, lastName: null };
    const student = (await response.json()) as { firstName: string; lastName: string };
    return { status: response.status, firstName: student.firstName, lastName: student.lastName };
  }, studentId);
}

export interface WaitingListEntryRead {
  waitingListEntryId: string;
  instrumentType: string;
  notes: string | null;
}

/** The seeded entry as the list read returns it, or null if it is no longer there. */
export async function fetchWaitingListEntry(
  page: Page,
  waitingListEntryId: string,
): Promise<WaitingListEntryRead | null> {
  return page.evaluate(async (waitingListEntryId) => {
    const response = await fetch('/api/waiting-list', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const groups = (await response.json()) as {
      entries: { waitingListEntryId: string; instrumentType: string; notes: string | null }[];
    }[];
    for (const group of groups) {
      const entry = group.entries.find((e) => e.waitingListEntryId === waitingListEntryId);
      if (entry) {
        return {
          waitingListEntryId: entry.waitingListEntryId,
          instrumentType: entry.instrumentType,
          notes: entry.notes,
        };
      }
    }
    return null;
  }, waitingListEntryId);
}

/**
 * The one lesson structure this suite keeps free of instrument courses, by
 * convention, so that "the school offers no instrument course for this
 * structure" is a state a scenario can actually reach.
 *
 * <p>
 * **Never seed an instrument course against this triple**, from any spec or
 * fixture. Enrolling off the waiting list resolves the instrument course for
 * the structure the Coordinator settles on, and refuses when there is none;
 * the refusal is only provable while some structure has none. Every other
 * combination is free to carry whatever a spec needs. A non-instrument course
 * here (Theory, Grade 2 Recorder, an Enrichment) is harmless — it is the
 * instrument one that destroys the state.
 * </p>
 */
export const COURSE_FREE_LESSON_STRUCTURE = {
  occurrenceType: 'AfterSchool',
  lessonType: 'Group',
  durationType: 'Hour',
} as const satisfies { occurrenceType: OccurrenceType; lessonType: LessonType; durationType: DurationType };

/**
 * Creates a course of the given type on the given lesson structure, through
 * the real `/api/courses` POST.
 *
 * <p>
 * A caller that wants an enrolment off the waiting list to resolve must pass
 * the `Instrument` course type — that is the only type the enrolment path
 * looks for. A course of any other type on the entry's structure leaves the
 * enrolment refused for want of an instrument course, which is a different
 * scenario's subject.
 * </p>
 *
 * <p>
 * **Reserved structure:** never call this with `'Instrument'` against
 * `COURSE_FREE_LESSON_STRUCTURE` (After School · Group · Hour). See that
 * constant for why.
 * </p>
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

/**
 * The lesson-structure id for one exact occurrence/lesson/duration triple —
 * for a scenario that needs a course on a structure other than the entry's:
 * the combination the Coordinator changes to under the same occurrence type,
 * or a structure under the other occurrence type entirely.
 */
export async function fetchLessonStructureId(
  page: Page,
  filter: { occurrenceType: OccurrenceType; lessonType: LessonType; durationType: DurationType },
): Promise<string> {
  const lessonStructureId = await page.evaluate(async (filter) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` };
    const response = await fetch('/api/lesson-structures', { headers });
    const structures = (await response.json()) as {
      lessonStructureId: string;
      lessonType: string;
      durationType: string;
      occurrenceType: string;
    }[];
    const structure = structures.find(
      (s) =>
        s.occurrenceType === filter.occurrenceType &&
        s.lessonType === filter.lessonType &&
        s.durationType === filter.durationType,
    );
    return structure?.lessonStructureId ?? null;
  }, filter);

  expect(lessonStructureId, 'a lesson structure matching the requested triple must exist').not.toBeNull();
  return lessonStructureId!;
}

export interface CourseFreeStructure {
  lessonStructureId: string;
  occurrenceType: OccurrenceType;
  lessonType: LessonType;
  durationType: DurationType;
}

/**
 * The lesson structure the school offers no instrument course for — the state
 * an enrolment off the waiting list is refused under, and one no fixture can
 * manufacture: creating an absence would mean deleting a course some other
 * suite seeded.
 *
 * <p>
 * It is `COURSE_FREE_LESSON_STRUCTURE`, reserved by convention and verified
 * here against the catalogue as it actually stands. If an instrument course
 * has appeared on it, this throws and names the convention rather than picking
 * some other structure: a scenario whose whole subject is the absence must
 * never quietly run against a structure that has a course.
 * </p>
 */
export async function fetchStructureWithoutInstrumentCourse(page: Page): Promise<CourseFreeStructure> {
  const reserved = COURSE_FREE_LESSON_STRUCTURE;

  const found = await page.evaluate(async (reserved) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` };

    const structures = (await (await fetch('/api/lesson-structures', { headers })).json()) as {
      lessonStructureId: string;
      lessonType: string;
      durationType: string;
      occurrenceType: string;
    }[];
    const structure = structures.find(
      (s) =>
        s.occurrenceType === reserved.occurrenceType &&
        s.lessonType === reserved.lessonType &&
        s.durationType === reserved.durationType,
    );
    if (structure === undefined) return { lessonStructureId: null, instrumentCourseCount: 0 };

    const courses = (await (await fetch('/api/courses', { headers })).json()) as {
      courseType: string;
      lessonStructureId: string;
    }[];
    const instrumentCourses = courses.filter(
      (c) => c.courseType === 'Instrument' && c.lessonStructureId === structure.lessonStructureId,
    );

    return { lessonStructureId: structure.lessonStructureId, instrumentCourseCount: instrumentCourses.length };
  }, reserved);

  const triple = `${reserved.occurrenceType} · ${reserved.lessonType} · ${reserved.durationType}`;
  expect(found.lessonStructureId, `the reserved lesson structure ${triple} must exist`).not.toBeNull();
  expect(
    found.instrumentCourseCount,
    `${triple} is reserved as the one structure with no instrument course, and something has seeded ` +
      `${found.instrumentCourseCount} against it. See COURSE_FREE_LESSON_STRUCTURE in e2e/fixtures/waitingList.ts: ` +
      'the no-instrument-course refusal cannot be proved while every structure carries one, and this fixture will ' +
      'not substitute another structure. Find what seeded it and move that course elsewhere.',
  ).toBe(0);

  return {
    lessonStructureId: found.lessonStructureId!,
    occurrenceType: reserved.occurrenceType,
    lessonType: reserved.lessonType,
    durationType: reserved.durationType,
  };
}

/**
 * A real lesson structure and teacher this caller can reach, without creating
 * either. For the role-refusal scenario, whose session cannot write to
 * `/api/courses` or `/api/teachers` at all: the refusal must be on the
 * caller's role, so the submission has to name values that would otherwise
 * have resolved.
 */
export async function fetchAnyEnrolmentTarget(
  page: Page,
): Promise<{ lessonStructureId: string; teacherId: string }> {
  const target = await page.evaluate(async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` };
    const structuresResponse = await fetch('/api/lesson-structures', { headers });
    const structures = (await structuresResponse.json()) as { lessonStructureId: string }[];
    const teachersResponse = await fetch('/api/teachers/roster', { headers });
    const teachers = (await teachersResponse.json()) as { teacherId: string; isActive: boolean }[];
    return {
      lessonStructureId: structures[0]?.lessonStructureId ?? null,
      teacherId: teachers.find((t) => t.isActive)?.teacherId ?? null,
    };
  });

  expect(target.lessonStructureId, 'at least one lesson structure must exist for this caller to name').not.toBeNull();
  expect(target.teacherId, 'at least one active teacher must exist for this caller to name').not.toBeNull();
  return { lessonStructureId: target.lessonStructureId!, teacherId: target.teacherId! };
}

export interface EnrolAttemptInput {
  /** The structure the enrolment names; the server resolves its instrument course. */
  lessonStructureId: string;
  teacherId: string;
  instrumentType?: InstrumentType;
  stepType?: string;
  enrolledDate?: string;
}

/**
 * The enrolment-off-the-waiting-list path, reached directly from the signed-in
 * session. Two boundaries have no control to press for them: a Teacher is
 * offered no Enrol action at all, and the modal presents the occurrence type as
 * a value rather than a control, deriving the structure from it — so no
 * structure the modal can name carries a different occurrence type. Both can
 * only be attempted by naming the request outright.
 */
export async function attemptEnrolFromWaitingList(
  page: Page,
  studentId: string,
  input: EnrolAttemptInput,
): Promise<number> {
  return page.evaluate(
    async ({ studentId, input }) => {
      const response = await fetch(`/api/waiting-list/students/${studentId}/enrollment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify({
          lessonStructureId: input.lessonStructureId,
          teacherId: input.teacherId,
          instrumentType: input.instrumentType ?? 'Piano',
          stepType: input.stepType ?? 'Step1A',
          enrolledDate: input.enrolledDate ?? new Date().toISOString().slice(0, 10),
        }),
      });
      return response.status;
    },
    { studentId, input },
  );
}

/**
 * Enrols a student who is already on the waiting list through the ordinary
 * roster path, which knows nothing of the entry and so leaves it in place.
 * This is the accepted both-states record — an entry the listing hides behind
 * an enrolment — and it is the control the consumption assertions are read
 * against.
 */
export async function enrollExistingStudent(
  page: Page,
  studentId: string,
  target: { courseId: string; teacherId: string },
): Promise<void> {
  const status = await page.evaluate(
    async ({ studentId, courseId, teacherId }) => {
      const response = await fetch(`/api/students/${studentId}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify({
          courseId,
          teacherId,
          instrumentType: null,
          stepType: null,
          enrolledDate: new Date().toISOString().slice(0, 10),
        }),
      });
      return response.status;
    },
    { studentId, courseId: target.courseId, teacherId: target.teacherId },
  );

  expect(status).toBe(201);
}

export interface StudentEnrollmentRead {
  studentCourseId: string;
  courseId: string;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
  teacherFirstName: string;
  teacherSurname: string;
  instrumentType: string | null;
  stepType: string | null;
  enrolledDate: string;
}

/**
 * A student's course enrolments, read back by id. A refusal has to be shown to
 * have created nothing, and an acceptance has to be shown to carry the chosen
 * teacher, instrument and date — and the occurrence type the student waited
 * under, which is the one value an enrolment off the list may not change.
 */
export async function fetchStudentEnrollments(page: Page, studentId: string): Promise<StudentEnrollmentRead[]> {
  return page.evaluate(async (studentId) => {
    const response = await fetch(`/api/students/${studentId}/courses`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    if (!response.ok) return [];
    return (await response.json()) as {
      studentCourseId: string;
      courseId: string;
      lessonType: string;
      durationType: string;
      occurrenceType: string;
      teacherFirstName: string;
      teacherSurname: string;
      instrumentType: string | null;
      stepType: string | null;
      enrolledDate: string;
    }[];
  }, studentId) as Promise<StudentEnrollmentRead[]>;
}
