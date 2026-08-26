import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';

const STUDENTS_BASE = '/api/students';

export type PhaseType = 'Junior' | 'Senior';
export type DayType = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface PracticeTime {
  practiceTimeId: string;
  day: DayType;
  /** A time of day with no date component, as the server's own text — e.g. `15:00:00`. */
  startTime: string;
}

/**
 * An activity as the Student modal shows one — assigned, or offered by the add
 * panel's picker. The shape is the server's, and the types are restated here
 * rather than imported from the extra-curriculars feature: a feature reaches
 * another through the API, never through its internals.
 */
export interface StudentExtraCurricular {
  extraCurricularId: string;
  description: string;
  phase: PhaseType;
  /** In day-of-week order from Monday, then start time — settled by the server. */
  practiceTimes: PracticeTime[];
}

export class StudentExtraCurricularsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'StudentExtraCurricularsError';
  }
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Throws the server's own reason, which is what the tab shows the user. */
async function assertOk(response: Response): Promise<void> {
  if (response.status === 401) {
    handleUnauthorized();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new StudentExtraCurricularsError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

/**
 * The activities the student takes part in. Uncached, like the student's
 * enrollments and guardians: assigning and removing refresh the list immediately
 * within a single wizard session.
 */
export async function getStudentExtraCurriculars(studentId: string): Promise<StudentExtraCurricular[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/extra-curriculars`, { headers: authHeaders() });
  return handleResponse<StudentExtraCurricular[]>(response);
}

/**
 * What the add panel's picker offers: activities of this student's own phase
 * that they do not already take part in. Both narrowings are the server's, so
 * the panel shows the list as it arrives rather than filtering it here.
 */
export async function getAssignableExtraCurriculars(studentId: string): Promise<StudentExtraCurricular[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/extra-curriculars/assignable`, {
    headers: authHeaders(),
  });
  return handleResponse<StudentExtraCurricular[]>(response);
}

/**
 * The same picker, for a student who does not exist yet. The create wizard
 * stages its assignments before the student is saved, so it has no identifier to
 * ask the student-scoped read with — and what it has already staged is its own to
 * leave out of the list.
 */
export async function getAssignableExtraCurricularsByPhase(phase: PhaseType): Promise<StudentExtraCurricular[]> {
  const response = await fetch(`${STUDENTS_BASE}/extra-curriculars/assignable?phase=${encodeURIComponent(phase)}`, {
    headers: authHeaders(),
  });
  return handleResponse<StudentExtraCurricular[]>(response);
}

export async function assignExtraCurricular(
  studentId: string,
  extraCurricularId: string,
): Promise<StudentExtraCurricular> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/extra-curriculars`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ extraCurricularId }),
  });
  return handleResponse<StudentExtraCurricular>(response);
}

/**
 * Removes the student's participation in one activity. The activity is how the
 * assignment is addressed — the link carries no identifier of its own.
 */
export async function removeExtraCurricular(studentId: string, extraCurricularId: string): Promise<void> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/extra-curriculars/${extraCurricularId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  // A removal answers with no body, so there is nothing to read back — only the
  // refusal, if there was one.
  await assertOk(response);
}
