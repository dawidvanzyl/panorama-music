import type { Page } from '@playwright/test';
import { expect } from './base';

export interface SeededEnrollmentTarget {
  courseId: string;
  courseLabel: string;
  teacherId: string;
  teacherName: string;
}

/**
 * A student must be enrolled in at least one course, so every student created in
 * a run needs a course and a teacher to exist first. Seeded through the API from
 * inside the signed-in page, so the requests carry the caller's bearer token —
 * `page.request` would send none.
 *
 * The course type is Grade 2 Recorder, which records neither an instrument nor a
 * step, so a caller that only needs *a* course to enroll into has the least to
 * fill in. Both records are unique per call, so parallel workers never contend
 * for the same row.
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

    const structuresResponse = await fetch('/api/lesson-structures', { headers });
    const structures = (await structuresResponse.json()) as {
      lessonStructureId: string;
      lessonType: string;
      durationType: string;
      occurrenceType: string;
    }[];
    const structure = structures.find(
      (s) => s.lessonType === 'Group' && s.durationType === 'HalfHour' && s.occurrenceType === 'DuringSchool',
    )!;

    // The cost is what tells this run's course apart from another's, the same
    // way the course-management spec identifies one.
    const cost = `${Date.now() % 100_000_000}.00`;
    const courseResponse = await fetch('/api/courses', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        courseType: 'G2Recorder',
        cost,
        lessonStructureId: structure.lessonStructureId,
      }),
    });
    const course = (await courseResponse.json()) as { courseId: string };

    return {
      teacherStatus: teacherResponse.status,
      courseStatus: courseResponse.status,
      courseId: course.courseId,
      teacherId: teacher.teacherId,
      teacherName: `${teacher.firstName} ${teacher.surname}`,
    };
  }, surname);

  expect(seeded.teacherStatus).toBe(201);
  expect(seeded.courseStatus).toBe(201);

  return {
    courseId: seeded.courseId,
    courseLabel: 'Grade 2 Recorder · Group · Half Hour · During School',
    teacherId: seeded.teacherId,
    teacherName: seeded.teacherName,
  };
}
