import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';
import { registerSessionCache } from '../../../services/session-cache';

const EXTRA_CURRICULARS_BASE = '/api/extra-curriculars';

export type PhaseType = 'Junior' | 'Senior';
export type DayType = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface PracticeTime {
  practiceTimeId: string;
  day: DayType;
  /** A time of day with no date component, as the server's own text — e.g. `07:30:00`. */
  startTime: string;
}

export interface ExtraCurricular {
  extraCurricularId: string;
  description: string;
  phase: PhaseType;
  /** In day-of-week order from Monday, then start time — settled by the server. */
  practiceTimes: PracticeTime[];
}

export interface PracticeTimeInput {
  day: DayType;
  /** `HH:mm`, as a time input produces it. */
  startTime: string;
}

export interface ExtraCurricularInput {
  description: string;
  phase: PhaseType;
  practiceTimes: PracticeTimeInput[];
}

export class ExtraCurricularsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ExtraCurricularsError';
  }
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    handleUnauthorized();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ExtraCurricularsError(body.error ?? `HTTP ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

let _extraCurricularsCache: ExtraCurricular[] | null = null;

export function clearExtraCurricularsCache(): void {
  _extraCurricularsCache = null;
}

registerSessionCache(clearExtraCurricularsCache);

/**
 * The whole catalogue in one read, held for the session. Narrowing it by
 * description, phase or day is a client-side concern applied over this cached
 * list, the same as it is for courses — see `filter-extra-curriculars.ts`.
 */
export async function getExtraCurriculars(): Promise<ExtraCurricular[]> {
  if (_extraCurricularsCache) return _extraCurricularsCache;

  const response = await fetch(EXTRA_CURRICULARS_BASE, { headers: authHeaders() });
  _extraCurricularsCache = await handleResponse<ExtraCurricular[]>(response);
  return _extraCurricularsCache;
}

/**
 * An activity and the whole of its weekly slots in one request — the slots are
 * owned by the activity, so there is no moment at which one exists without the
 * other.
 */
export async function createExtraCurricular(input: ExtraCurricularInput): Promise<ExtraCurricular> {
  const response = await fetch(EXTRA_CURRICULARS_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      description: input.description,
      phase: input.phase,
      practiceTimes: input.practiceTimes.map((slot) => ({ day: slot.day, startTime: slot.startTime })),
    }),
  });
  const result = await handleResponse<ExtraCurricular>(response);
  clearExtraCurricularsCache();
  return result;
}
