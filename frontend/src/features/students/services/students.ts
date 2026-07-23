import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';

const API_BASE = '/api/students';

export type Grade = 'Grade1' | 'Grade2' | 'Grade3' | 'Grade4' | 'Grade5' | 'Grade6' | 'Grade7' | 'Private';
export type StudentClass = 'A1' | 'A2' | 'E1' | 'E2' | 'E3' | 'E4';
export type Phase = 'Junior' | 'Senior';
export type StudentLanguage = 'Afrikaans' | 'English';

export interface StudentResult {
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  grade: Grade;
  class: StudentClass;
  phase: Phase;
  language: StudentLanguage;
}

export interface StudentInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  grade: Grade;
  class: StudentClass;
  phase: Phase;
  language: StudentLanguage;
}

export class StudentsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'StudentsError';
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
    throw new StudentsError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

let _studentsCache: StudentResult[] | null = null;

export function clearStudentsCache(): void {
  _studentsCache = null;
}

/**
 * Returns the full student roster. Grade/phase/class/name filtering is a
 * client-side concern applied over this cached list, not a server round trip.
 */
export async function getStudents(): Promise<StudentResult[]> {
  if (_studentsCache) return _studentsCache;

  const response = await fetch(API_BASE, { headers: authHeaders() });
  _studentsCache = await handleResponse<StudentResult[]>(response);
  return _studentsCache;
}

export async function createStudent(input: StudentInput): Promise<StudentResult> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<StudentResult>(response);
  clearStudentsCache();
  return result;
}

export async function updateStudent(studentId: string, input: StudentInput): Promise<StudentResult> {
  const response = await fetch(`${API_BASE}/${studentId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<StudentResult>(response);
  clearStudentsCache();
  return result;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${studentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
  clearStudentsCache();
}

/**
 * Siblings are per-student and change frequently within a single wizard
 * session (add/remove refreshes the list immediately), so unlike getStudents
 * this is a plain, uncached fetch — caching would just risk staleness for
 * little benefit here.
 */
export async function getSiblings(studentId: string): Promise<StudentResult[]> {
  const response = await fetch(`${API_BASE}/${studentId}/siblings`, { headers: authHeaders() });
  return handleResponse<StudentResult[]>(response);
}

export async function addSibling(studentId: string, siblingId: string): Promise<StudentResult> {
  const response = await fetch(`${API_BASE}/${studentId}/siblings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ siblingId }),
  });
  return handleResponse<StudentResult>(response);
}

export async function removeSibling(studentId: string, siblingId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${studentId}/siblings/${siblingId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
}
