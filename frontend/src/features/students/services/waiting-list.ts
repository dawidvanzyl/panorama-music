import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';
import { registerSessionCache } from '../../../services/session-cache';
import type { OccurrenceType, LessonType, DurationType, InstrumentType } from './enrollments';

const API_BASE = '/api/waiting-list';

// Milestone-wide vocabulary, not waiting-list vocabulary — owned by
// enrollments.ts (courses.ts holds its own copy too; that duplication is
// pre-existing and out of scope here). Re-exported so this module stays the
// one import site for a waiting-list consumer, without minting a fourth
// declaration of the same unions.
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
