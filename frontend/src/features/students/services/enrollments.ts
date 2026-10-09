import { assertOk, authHeaders, handleResponse } from '../../../services/api-client';
import { clearStudentsCache } from './students';
import type {
  CourseType,
  LessonType,
  DurationType,
  OccurrenceType,
  InstrumentType,
} from '../../../services/lesson-structure';

const STUDENTS_BASE = '/api/students';
const COURSES_BASE = '/api/courses';
const TEACHERS_ROSTER = '/api/teachers/roster';

// Shared with the Courses feature via services/lesson-structure.ts —
// re-exported here so existing imports from this module keep working.
export type { CourseType, LessonType, DurationType, OccurrenceType, InstrumentType };
export type StepType = 'Step1A' | 'Step1B' | 'Step2A' | 'Step2B' | 'Step3A' | 'Step3B' | 'Step4A' | 'Step4B' | 'Other';

/** A course as the enroll form offers it — its identity, type and lesson structure. */
export interface EnrollableCourse {
  courseId: string;
  courseType: CourseType;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
}

/** A teacher as the enroll form offers one — no more of the record than a name. */
export interface AssignableTeacher {
  teacherId: string;
  firstName: string;
  surname: string;
  isActive: boolean;
}

export interface EnrollmentResult {
  studentCourseId: string;
  studentId: string;
  courseId: string;
  courseType: CourseType;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
  teacherId: string;
  teacherFirstName: string;
  teacherSurname: string;
  instrumentType: InstrumentType | null;
  stepType: StepType | null;
  enrolledDate: string;
}

export interface EnrollmentInput {
  courseId: string;
  teacherId: string;
  instrumentType: InstrumentType | null;
  stepType: StepType | null;
  enrolledDate: string;
}

/**
 * What an existing enrollment may be corrected to. The course and the enrolled
 * date are settled at enrollment and so are absent here — correcting either
 * means withdrawing and re-enrolling.
 */
export interface EnrollmentUpdateInput {
  teacherId: string;
  instrumentType: InstrumentType | null;
  stepType: StepType | null;
}

export class EnrollmentsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'EnrollmentsError';
  }
}

/**
 * A student's enrollments change within a single wizard session (enrolling
 * refreshes the list immediately), so like getGuardians this is a plain,
 * uncached fetch.
 */
export async function getStudentCourses(studentId: string): Promise<EnrollmentResult[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/courses`, { headers: authHeaders() });
  return handleResponse<EnrollmentResult[]>(response, EnrollmentsError);
}

export async function enrollStudent(studentId: string, input: EnrollmentInput): Promise<EnrollmentResult> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/courses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<EnrollmentResult>(response, EnrollmentsError);
  clearStudentsCache();
  return result;
}

export async function updateEnrollment(
  studentId: string,
  studentCourseId: string,
  input: EnrollmentUpdateInput,
): Promise<EnrollmentResult> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/courses/${studentCourseId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<EnrollmentResult>(response, EnrollmentsError);
  clearStudentsCache();
  return result;
}

/** Withdraws the student from the course, removing the enrollment outright. */
export async function withdrawEnrollment(studentId: string, studentCourseId: string): Promise<void> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/courses/${studentCourseId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response, EnrollmentsError);
  clearStudentsCache();
}

/**
 * The catalogue the enroll form's Course select offers. This feature reads it
 * for itself rather than reaching into the courses feature's own service — a
 * feature communicates through the API, not through another feature's
 * internals.
 *
 * Uncached, deliberately. A cache is invalidated by the service that owns the
 * data, and the mutations that stale this one — creating, repricing and
 * deleting a course — happen in the courses feature, which cannot reach in
 * here to clear it. The read costs one call each time the wizard opens.
 */
export async function getEnrollableCourses(): Promise<EnrollableCourse[]> {
  const response = await fetch(COURSES_BASE, { headers: authHeaders() });
  return handleResponse<EnrollableCourse[]>(response, EnrollmentsError);
}

/**
 * The teachers the enroll form's Teacher select offers, narrowed to those still
 * in active service — a stood-down teacher is not someone to assign a new
 * enrollment to. Read for this feature's own use, and uncached for the same
 * reason the course catalogue is: standing a teacher down happens in the
 * teachers feature.
 */
export async function getAssignableTeachers(): Promise<AssignableTeacher[]> {
  const response = await fetch(TEACHERS_ROSTER, { headers: authHeaders() });
  const teachers = await handleResponse<AssignableTeacher[]>(response, EnrollmentsError);
  return teachers.filter((teacher) => teacher.isActive);
}
