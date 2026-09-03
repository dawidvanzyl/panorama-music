import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';
import { registerSessionCache } from '../../../services/session-cache';
import type { OccurrenceType, LessonType, DurationType, InstrumentType } from './enrollments';
import type { StudentInput } from './students';

const API_BASE = '/api/waiting-list';
const LESSON_STRUCTURES_BASE = '/api/lesson-structures';

// Milestone-wide vocabulary, not waiting-list vocabulary — owned by
// enrollments.ts, which itself re-exports it from services/lesson-structure.ts
// (ruling R5/R6). Re-exported so this module stays the one import site for a
// waiting-list consumer, without minting a fourth declaration of the same
// unions.
export type { OccurrenceType, LessonType, DurationType, InstrumentType };

export interface WaitingListEntryResult {
  waitingListEntryId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  /** One-based position within this entry's occurrence-type group, derived server-side. */
  position: number;
  lessonType: LessonType;
  durationType: DurationType;
  instrumentType: InstrumentType;
  notes: string | null;
  addedAt: string;
}

export interface WaitingListGroupResult {
  occurrenceType: OccurrenceType;
  count: number;
  /** In queue order — position 1 first. An occurrence type with no entries is omitted entirely. */
  entries: WaitingListEntryResult[];
}

/** The seeded occurrence/lesson/duration combination a waiting-list entry is captured against. */
export interface LessonStructure {
  lessonStructureId: string;
  lessonType: LessonType;
  durationType: DurationType;
  occurrenceType: OccurrenceType;
}

/**
 * The Waiting List tab's own fields — no course, since an entry names none,
 * and no date added: the server assigns it at capture and nothing may change
 * it afterwards, so there is no field here to send either way.
 */
export interface WaitingListEntryInput {
  lessonStructureId: string;
  instrumentType: InstrumentType;
  notes: string | null;
}

export class WaitingListError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'WaitingListError';
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
    throw new WaitingListError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

let _waitingListCache: WaitingListGroupResult[] | null = null;

export function clearWaitingListCache(): void {
  _waitingListCache = null;
}

registerSessionCache(clearWaitingListCache);

/**
 * The waiting list grouped by occurrence type, During School before After
 * School, each entry carrying its derived queue position. An occurrence type
 * with nothing waiting under it is not returned at all.
 */
export async function getWaitingList(): Promise<WaitingListGroupResult[]> {
  if (_waitingListCache) return _waitingListCache;

  const response = await fetch(API_BASE, { headers: authHeaders() });
  _waitingListCache = await handleResponse<WaitingListGroupResult[]>(response);
  return _waitingListCache;
}

let _lessonStructuresCache: LessonStructure[] | null = null;

export function clearLessonStructuresCache(): void {
  _lessonStructuresCache = null;
}

registerSessionCache(clearLessonStructuresCache);

/**
 * The seeded lesson-structure lookup, cached the same way the catalogue
 * screen's own copy is (`features/courses/services/courses.ts`). Fetched
 * again here, rather than imported across features, for the same reason
 * `getWaitingList` lives in this feature at all — both are self-contained
 * (ruling R5).
 */
export async function getLessonStructures(): Promise<LessonStructure[]> {
  if (_lessonStructuresCache) return _lessonStructuresCache;

  const response = await fetch(LESSON_STRUCTURES_BASE, { headers: authHeaders() });
  _lessonStructuresCache = await handleResponse<LessonStructure[]>(response);
  return _lessonStructuresCache;
}

/**
 * Captures a student and their single waiting-list entry together. The
 * server assigns the added date-time — this input carries no such field, and
 * none exists to omit.
 */
export async function captureWaitingListStudent(
  student: StudentInput,
  waitingList: WaitingListEntryInput,
): Promise<WaitingListEntryResult> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...student, ...waitingList }),
  });
  const created = await handleResponse<WaitingListEntryResult>(response);
  clearWaitingListCache();
  return created;
}

/**
 * Corrects an existing entry's own fields. The added date-time is not part of
 * the payload — it is the queue's ordering key, and the endpoint has nowhere
 * to put one — so an entry moved to the other occurrence type keeps its
 * standing there rather than joining the back.
 */
export async function updateWaitingListEntry(
  waitingListEntryId: string,
  input: WaitingListEntryInput,
): Promise<WaitingListEntryResult> {
  const response = await fetch(`${API_BASE}/${waitingListEntryId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const updated = await handleResponse<WaitingListEntryResult>(response);
  clearWaitingListCache();
  return updated;
}

/**
 * Corrects a waiting-list student's own details. Reached through the waiting
 * list rather than through `updateStudent`, which is a Teacher's: this route
 * is a Coordinator's, and only resolves a student who holds an entry.
 */
export async function updateWaitingListStudent(studentId: string, input: StudentInput): Promise<void> {
  const response = await fetch(`${API_BASE}/students/${studentId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  await assertOk(response);
  clearWaitingListCache();
}

/**
 * Discards a waiting-list student: their entry and their student record go
 * together. They were never enrolled, so nothing of theirs is kept — this is
 * not a withdrawal.
 */
export async function removeWaitingListStudent(studentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/students/${studentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
  clearWaitingListCache();
}
