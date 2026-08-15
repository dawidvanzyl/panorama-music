import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';
import { registerSessionCache } from '../../../services/session-cache';

const COURSES_BASE = '/api/courses';
const LESSON_STRUCTURES_BASE = '/api/lesson-structures';

export type CourseType = 'Theory' | 'GREEnrichment' | 'G1Enrichment' | 'G2Recorder' | 'Instrument';
export type LessonType = 'Individual' | 'Group';
export type DurationType = 'Hour' | 'HalfHour';
export type OccurrenceType = 'DuringSchool' | 'AfterSchool';

export interface LessonStructure {
  lessonStructureId: string;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
}

export interface Course {
  courseId: string;
  courseType: CourseType;
  /** An exact decimal amount; kept as the server's string-free number only for display. */
  cost: number;
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

export interface CourseFilter {
  courseType?: CourseType;
  lessonType?: LessonType;
  durationType?: DurationType;
  occurrenceType?: OccurrenceType;
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

function toQuery(filter: CourseFilter): string {
  const params = new URLSearchParams();
  if (filter.courseType) params.set('courseType', filter.courseType);
  if (filter.lessonType) params.set('lessonType', filter.lessonType);
  if (filter.durationType) params.set('durationType', filter.durationType);
  if (filter.occurrenceType) params.set('occurrenceType', filter.occurrenceType);

  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Filtering is a server concern here rather than a client one — the endpoint
 * combines the four dimensions itself, so each selection is a fresh read rather
 * than a narrowing of a cached list.
 */
export async function getCourses(filter: CourseFilter = {}): Promise<Course[]> {
  const response = await fetch(`${COURSES_BASE}${toQuery(filter)}`, { headers: authHeaders() });
  return handleResponse<Course[]>(response);
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const response = await fetch(COURSES_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      courseType: input.courseType,
      // Sent as a JSON number so the server binds it to a decimal; the form
      // holds the typed text until this point so no rounding happens earlier.
      cost: Number(input.cost),
      lessonStructureId: input.lessonStructureId,
    }),
  });
  return handleResponse<Course>(response);
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
