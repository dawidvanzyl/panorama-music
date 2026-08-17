import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';
import { registerSessionCache } from '../../../services/session-cache';

const STUDENTS_BASE = '/api/students';
const COURSES_BASE = '/api/courses';
const TEACHERS_BASE = '/api/teachers';

export type CourseType = 'Theory' | 'GREEnrichment' | 'G1Enrichment' | 'G2Recorder' | 'Instrument';
export type LessonType = 'Individual' | 'Group';
export type DurationType = 'Hour' | 'HalfHour';
export type OccurrenceType = 'DuringSchool' | 'AfterSchool';
export type InstrumentType = 'Piano' | 'Guitar' | 'Recorder' | 'Keyboard' | 'Voice' | 'Other';
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

export class EnrollmentsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'EnrollmentsError';
  }
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function assertOk(response: Response): Promise<void> {
  if (response.status === 401) {
    handleUnauthorized();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new EnrollmentsError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

/**
 * A student's enrollments change within a single wizard session (enrolling
 * refreshes the list immediately), so like getGuardians this is a plain,
 * uncached fetch.
 */
export async function getStudentCourses(studentId: string): Promise<EnrollmentResult[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/courses`, { headers: authHeaders() });
  return handleResponse<EnrollmentResult[]>(response);
}

export async function enrollStudent(studentId: string, input: EnrollmentInput): Promise<EnrollmentResult> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/courses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<EnrollmentResult>(response);
}

let _enrollableCoursesCache: EnrollableCourse[] | null = null;

export function clearEnrollableCoursesCache(): void {
  _enrollableCoursesCache = null;
}

registerSessionCache(clearEnrollableCoursesCache);

/**
 * The catalogue the enroll form's Course select offers. This feature reads it
 * for itself rather than reaching into the courses feature's own service — a
 * feature communicates through the API, not through another feature's
 * internals — and holds it for the session as reference data.
 */
export async function getEnrollableCourses(): Promise<EnrollableCourse[]> {
  if (_enrollableCoursesCache) return _enrollableCoursesCache;

  const response = await fetch(COURSES_BASE, { headers: authHeaders() });
  _enrollableCoursesCache = await handleResponse<EnrollableCourse[]>(response);
  return _enrollableCoursesCache;
}

let _assignableTeachersCache: AssignableTeacher[] | null = null;

export function clearAssignableTeachersCache(): void {
  _assignableTeachersCache = null;
}

registerSessionCache(clearAssignableTeachersCache);

/**
 * The teachers the enroll form's Teacher select offers, narrowed to those still
 * in active service — a stood-down teacher is not someone to assign a new
 * enrollment to. Read for this feature's own use, for the same reason the
 * course catalogue is.
 */
export async function getAssignableTeachers(): Promise<AssignableTeacher[]> {
  if (_assignableTeachersCache) return _assignableTeachersCache;

  const response = await fetch(TEACHERS_BASE, { headers: authHeaders() });
  const teachers = await handleResponse<AssignableTeacher[]>(response);
  _assignableTeachersCache = teachers.filter((teacher) => teacher.isActive);
  return _assignableTeachersCache;
}
