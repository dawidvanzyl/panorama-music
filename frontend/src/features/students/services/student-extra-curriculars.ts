import { assertOk, authHeaders, handleResponse } from '../../../services/api-client';

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

/**
 * The activities the student takes part in. Uncached, like the student's
 * enrollments and guardians: assigning and removing refresh the list immediately
 * within a single wizard session.
 */
export async function getStudentExtraCurriculars(studentId: string): Promise<StudentExtraCurricular[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/extra-curriculars`, { headers: authHeaders() });
  return handleResponse<StudentExtraCurricular[]>(response, StudentExtraCurricularsError);
}

/**
 * What the add panel's picker offers: the activities of a phase, or of every
 * phase when the phase is null, which is what a Private-grade student is offered.
 * Both the create and the edit wizard read through this one, driven by the phase
 * the Student step's field currently holds rather than by any stored student — an
 * unsaved phase change has to be reflected, and a student-scoped read resolves the
 * phase from the stored row, which cannot see one.
 *
 * It narrows by phase only, so leaving out what the student already takes part in
 * is the step's own filter — the same one it applies to staged activities.
 *
 * The student-scoped `GET /api/students/{id}/extra-curriculars/assignable` still
 * exists and is still tested; nothing in the interface reads through it now.
 */
export async function getAssignableExtraCurricularsByPhase(phase: PhaseType | null): Promise<StudentExtraCurricular[]> {
  const query = phase ? `?phase=${encodeURIComponent(phase)}` : '';
  const response = await fetch(`${STUDENTS_BASE}/extra-curriculars/assignable${query}`, {
    headers: authHeaders(),
  });
  return handleResponse<StudentExtraCurricular[]>(response, StudentExtraCurricularsError);
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
  return handleResponse<StudentExtraCurricular>(response, StudentExtraCurricularsError);
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
  await assertOk(response, StudentExtraCurricularsError);
}
