import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';
import { registerSessionCache } from '../../../services/session-cache';
import type { CourseType, LessonType, DurationType, OccurrenceType } from '../../../services/lesson-structure';

const COURSES_BASE = '/api/courses';
const LESSON_STRUCTURES_BASE = '/api/lesson-structures';

// Shared with the Students feature via services/lesson-structure.ts —
// re-exported here so existing imports from this module keep working.
export type { CourseType, LessonType, DurationType, OccurrenceType };

export interface LessonStructure {
  lessonStructureId: string;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
}

export interface Course {
  courseId: string;
  courseType: CourseType;
  /**
   * An exact decimal amount, kept as the server's own text. It is never put
   * through `Number`, which would make a monetary value an IEEE-754 double.
   */
  cost: string;
  lessonStructureId: string;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
}

export interface CourseInput {
  courseType: CourseType;
  cost: string;
  lessonStructureId: string;
}

export class CoursesError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'CoursesError';
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
    throw new CoursesError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

let _coursesCache: Course[] | null = null;

export function clearCoursesCache(): void {
  _coursesCache = null;
}

registerSessionCache(clearCoursesCache);

/**
 * The whole catalogue in one read, held for the session. Narrowing it is a
 * client-side concern applied over this cached list, the same as it is for
 * students — see `filter-courses.ts`.
 */
export async function getCourses(): Promise<Course[]> {
  if (_coursesCache) return _coursesCache;

  const response = await fetch(COURSES_BASE, { headers: authHeaders() });
  _coursesCache = await handleResponse<Course[]>(response);
  return _coursesCache;
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const response = await fetch(COURSES_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      courseType: input.courseType,
      // Sent as the typed text, not a JSON number — the server binds the string
      // straight to a decimal, so the amount never becomes a double in transit.
      cost: input.cost,
      lessonStructureId: input.lessonStructureId,
    }),
  });
  const result = await handleResponse<Course>(response);
  clearCoursesCache();
  return result;
}

/**
 * Cost is the whole of a course's mutable state, so the update is a PUT of a
 * full representation of it. The amount is sent as the typed text for the same
 * reason a create's is — it never becomes a double in transit.
 */
export async function updateCourseCost(courseId: string, cost: string): Promise<Course> {
  const response = await fetch(`${COURSES_BASE}/${courseId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ cost }),
  });
  const result = await handleResponse<Course>(response);
  clearCoursesCache();
  return result;
}

export interface CourseEnrollmentCount {
  count: number;
}

/**
 * How many students are enrolled in the course — the same condition the API
 * enforces on delete. Lets the maintenance screen tell the user a course is in
 * use before offering a confirmation it would have to reject.
 */
export async function countCourseEnrollments(courseId: string): Promise<CourseEnrollmentCount> {
  const response = await fetch(`${COURSES_BASE}/${courseId}/enrollments/count`, { headers: authHeaders() });
  return handleResponse<CourseEnrollmentCount>(response);
}

/** Rejected by the API with a 400 while any student is still enrolled in the course. */
export async function deleteCourse(courseId: string): Promise<void> {
  const response = await fetch(`${COURSES_BASE}/${courseId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
  clearCoursesCache();
}

let _lessonStructuresCache: LessonStructure[] | null = null;

export function clearLessonStructuresCache(): void {
  _lessonStructuresCache = null;
}

registerSessionCache(clearLessonStructuresCache);

/** Fixed seeded reference data — nothing in the app maintains it, so it is cached for the session. */
export async function getLessonStructures(): Promise<LessonStructure[]> {
  if (_lessonStructuresCache) return _lessonStructuresCache;

  const response = await fetch(LESSON_STRUCTURES_BASE, { headers: authHeaders() });
  _lessonStructuresCache = await handleResponse<LessonStructure[]>(response);
  return _lessonStructuresCache;
}
