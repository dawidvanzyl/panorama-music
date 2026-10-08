import type { Page } from '@playwright/test';
import { expect } from './base';
import { ensureCourseOfType, fetchLessonStructureId } from './waitingList';

export interface SeededEnrollmentTarget {
  courseId: string;
  courseLabel: string;
  /** The course's actual cost, which is what identifies it on Course Management. */
  courseCost: string;
  teacherId: string;
  teacherName: string;
}

/**
 * A student must hold at least one course or one extra-curricular, and most
 * students in a run hold a course, so they need a course and a teacher to exist
 * first. Seeded through the API from
 * inside the signed-in page, so the requests carry the caller's bearer token —
 * `page.request` would send none.
 *
 * The course type is Grade 2 Recorder, which records neither an instrument nor a
 * step, so a caller that only needs *a* course to enroll into has the least to
 * fill in. The teacher is unique per call. The course is not: a course type and
 * a lesson structure identify at most one course, so every call returns the one
 * course that pair already has, creating it only if it is absent. Callers need
 * the returned `courseCost`, never one of their own, and two calls give the same
 * course. A caller that needs two distinct courses must use a different pair for
 * the second.
 *
 * <p>
 * **Before seeding a course anywhere in this suite, read
 * `COURSE_FREE_LESSON_STRUCTURE` in `waitingList.ts`.** One lesson structure —
 * After School · Group · Hour — is kept free of *instrument* courses by
 * convention, because enrolling off the waiting list resolves the instrument
 * course for a structure and refuses when there is none, and that refusal is
 * only provable while some structure has none. Any other course type there, and
 * any course type anywhere else, is fine. This fixture seeds Grade 2 Recorder
 * on During School · Group · Half Hour and touches neither.
 * </p>
 */
export async function seedEnrollmentTarget(page: Page): Promise<SeededEnrollmentTarget> {
  const surname = `Enroll-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const seeded = await page.evaluate(async (teacherSurname) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
    };

    const teacherResponse = await fetch('/api/teachers', {
      method: 'POST',
      headers,
      body: JSON.stringify({ firstName: 'Enrollment', surname: teacherSurname, isPrivate: false }),
    });
    const teacher = (await teacherResponse.json()) as {
      teacherId: string;
      firstName: string;
      surname: string;
    };

    return {
      teacherStatus: teacherResponse.status,
      teacherId: teacher.teacherId,
      teacherName: `${teacher.firstName} ${teacher.surname}`,
    };
  }, surname);

  expect(seeded.teacherStatus).toBe(201);

  const structureId = await fetchLessonStructureId(page, {
    occurrenceType: 'DuringSchool',
    lessonType: 'Group',
    durationType: 'HalfHour',
  });
  const course = await ensureCourseOfType(page, structureId, 'G2Recorder');

  return {
    courseId: course.courseId,
    courseLabel: 'Grade 2 Recorder · Group · Half Hour · During School',
    courseCost: course.cost,
    teacherId: seeded.teacherId,
    teacherName: seeded.teacherName,
  };
}

/**
 * Creates a student already enrolled in the seeded course, through the API
 * rather than the wizard, for a test whose subject is something else.
 * <p>
 * Both writes name the course by id: the label the enroll form offers is shared
 * by every course of the same type and structure, so going through the wizard
 * could enroll the student in a different course of the same shape — or in this
 * very one, making the enrollment below a duplicate.
 * </p>
 * <p>
 * `lastName` creates the student under a caller-supplied family surname, for a
 * scenario that needs an enrolled student and a waiting-list student in one
 * family so a listing can be read scoped to it. Omit it and the seeder mints
 * its own unique surname as before. The first name stays `Amara`, which is
 * what tells this student apart from a waiting-list sibling sharing the
 * surname.
 * </p>
 */
export async function seedEnrolledStudent(
  page: Page,
  target: SeededEnrollmentTarget,
  lastName?: string,
): Promise<string> {
  const surname = lastName ?? `Enrolled-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const seeded = await page.evaluate(
    async ({ surname, courseId, teacherId }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };

      const studentResponse = await fetch('/api/students', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: 'Amara',
          lastName: surname,
          dateOfBirth: '2014-05-12',
          grade: 'Grade4',
          class: 'A1',
          phase: 'Junior',
          language: 'English',
        }),
      });
      const student = (await studentResponse.json()) as { studentId: string };

      const enrollResponse = await fetch(`/api/students/${student.studentId}/courses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseId,
          teacherId,
          instrumentType: null,
          stepType: null,
          enrolledDate: new Date().toISOString().slice(0, 10),
        }),
      });

      return {
        studentStatus: studentResponse.status,
        enrollStatus: enrollResponse.status,
        studentId: student.studentId,
      };
    },
    { surname, courseId: target.courseId, teacherId: target.teacherId },
  );

  expect(seeded.studentStatus).toBe(201);
  expect(seeded.enrollStatus).toBe(201);

  await waitForSeededEntry(page, `/api/students/${seeded.studentId}/courses`, 'studentCourseId');
  return seeded.studentId;
}

/** The id of the student with this surname, read back from the roster. */
export async function studentIdBySurname(page: Page, surname: string): Promise<string> {
  return page.evaluate(async (lastName) => {
    const response = await fetch('/api/students', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const students = (await response.json()) as { studentId: string; lastName: string }[];
    return students.find((s) => s.lastName === lastName)!.studentId;
  }, surname);
}

/**
 * Creates a student holding one extra-curricular and no course, through the API.
 * Creation is not gated, so the student is created first and the activity is
 * assigned afterwards; no enrollment is ever made. Returns the student's id.
 */
export async function seedActivityOnlyStudent(
  page: Page,
  extraCurricularId: string,
  lastName: string,
): Promise<string> {
  const seeded = await page.evaluate(
    async ({ surname, extraCurricularId }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };

      const studentResponse = await fetch('/api/students', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: 'Amara',
          lastName: surname,
          dateOfBirth: '2014-05-12',
          grade: 'Grade4',
          class: 'A1',
          phase: 'Junior',
          language: 'English',
        }),
      });
      const student = (await studentResponse.json()) as { studentId: string };

      const assignResponse = await fetch(`/api/students/${student.studentId}/extra-curriculars`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ extraCurricularId }),
      });

      return {
        studentStatus: studentResponse.status,
        assignStatus: assignResponse.status,
        studentId: student.studentId,
      };
    },
    { surname: lastName, extraCurricularId },
  );

  expect(seeded.studentStatus).toBe(201);
  expect(seeded.assignStatus).toBe(201);

  await waitForSeededEntry(page, `/api/students/${seeded.studentId}/extra-curriculars`, 'extraCurricularId', extraCurricularId);
  return seeded.studentId;
}

/**
 * Creates a Private-grade student holding the given extra-curriculars and no
 * course, through the API. A Private-grade student has no class or phase, so
 * any activity may be assigned. Each assignment is polled for before the id is
 * returned. Returns the student's id.
 */
export async function seedPrivateActivityOnlyStudent(
  page: Page,
  extraCurricularIds: string[],
  lastName: string,
): Promise<string> {
  const seeded = await page.evaluate(
    async ({ surname, extraCurricularIds }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };

      const studentResponse = await fetch('/api/students', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: 'Amara',
          lastName: surname,
          dateOfBirth: '2014-05-12',
          grade: 'Private',
          class: null,
          phase: null,
          language: 'English',
        }),
      });
      const student = (await studentResponse.json()) as { studentId: string };

      const assignStatuses: number[] = [];
      for (const extraCurricularId of extraCurricularIds) {
        const assignResponse = await fetch(`/api/students/${student.studentId}/extra-curriculars`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ extraCurricularId }),
        });
        assignStatuses.push(assignResponse.status);
      }

      return { studentStatus: studentResponse.status, assignStatuses, studentId: student.studentId };
    },
    { surname: lastName, extraCurricularIds },
  );

  expect(seeded.studentStatus).toBe(201);
  expect(seeded.assignStatuses).toEqual(extraCurricularIds.map(() => 201));

  for (const extraCurricularId of extraCurricularIds) {
    await waitForSeededEntry(page, `/api/students/${seeded.studentId}/extra-curriculars`, 'extraCurricularId', extraCurricularId);
  }
  return seeded.studentId;
}

/**
 * A write's response can reach the caller before its transaction commits, so a
 * request sent straight after a seeding call may not see what it seeded. Waits
 * until a read of `path` returns an entry whose `key` equals `value` (or any
 * entry, when `value` is omitted).
 */
export async function waitForSeededEntry(
  page: Page,
  path: string,
  key: string,
  value?: string,
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(
          async ({ path, key, value }) => {
            const response = await fetch(path, {
              headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
            });
            if (!response.ok) return false;
            const entries = (await response.json()) as Record<string, unknown>[];
            return entries.some((entry) => value === undefined || entry[key] === value);
          },
          { path, key, value },
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
}
