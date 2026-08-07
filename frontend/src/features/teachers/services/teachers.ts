import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';

const API_BASE = '/api/teachers';

export interface TeacherResult {
  teacherId: string;
  firstName: string;
  surname: string;
  /** True means paid directly by parents; false means paid by the school. */
  isPrivate: boolean;
  isActive: boolean;
  linkedAccountId: string | null;
  /** The linked account's email address, or null when there is no link. */
  linkedAccountEmail: string | null;
}

/** A login account the server has already judged eligible for linking. */
export interface LinkableAccount {
  accountId: string;
  email: string;
}

export interface TeacherInput {
  firstName: string;
  surname: string;
  isPrivate: boolean;
  /** Optional — a teacher created without a login account is a complete record. */
  linkedAccountId?: string | null;
}

export interface TeacherProfileInput {
  firstName: string;
  surname: string;
}

export class TeachersError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'TeachersError';
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
    throw new TeachersError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

let _teachersCache: TeacherResult[] | null = null;

export function clearTeachersCache(): void {
  _teachersCache = null;
}

/**
 * Returns the full teacher roster. Status/type/linked-account filtering is a
 * client-side concern applied over this cached list, not a server round trip.
 */
export async function getTeachers(): Promise<TeacherResult[]> {
  if (_teachersCache) return _teachersCache;

  const response = await fetch(API_BASE, { headers: authHeaders() });
  _teachersCache = await handleResponse<TeacherResult[]>(response);
  return _teachersCache;
}

export async function getTeacherById(teacherId: string): Promise<TeacherResult> {
  const response = await fetch(`${API_BASE}/${teacherId}`, { headers: authHeaders() });
  return handleResponse<TeacherResult>(response);
}

export async function createTeacher(input: TeacherInput): Promise<TeacherResult> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<TeacherResult>(response);
  clearTeachersCache();
  return result;
}

/** Updates the profile names only — the classification has its own endpoint. */
export async function updateTeacherProfile(teacherId: string, input: TeacherProfileInput): Promise<TeacherResult> {
  const response = await fetch(`${API_BASE}/${teacherId}/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<TeacherResult>(response);
  clearTeachersCache();
  return result;
}

/**
 * The accounts that may be offered in the link picker. Never cached: the set
 * shrinks the moment anyone links an account, and offering a stale one would
 * only produce a rejection at save time.
 */
export async function getLinkableAccounts(): Promise<LinkableAccount[]> {
  const response = await fetch(`${API_BASE}/linkable-accounts`, { headers: authHeaders() });
  return handleResponse<LinkableAccount[]>(response);
}

/** Attaches a login account. A link is established or removed, never changed in place. */
export async function linkTeacherAccount(teacherId: string, accountId: string): Promise<TeacherResult> {
  const response = await fetch(`${API_BASE}/${teacherId}/account`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ accountId }),
  });
  const result = await handleResponse<TeacherResult>(response);
  clearTeachersCache();
  return result;
}

export async function unlinkTeacherAccount(teacherId: string): Promise<TeacherResult> {
  const response = await fetch(`${API_BASE}/${teacherId}/account`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const result = await handleResponse<TeacherResult>(response);
  clearTeachersCache();
  return result;
}

/** Persists the employment classification on its own, outside the edit flow. */
export async function updateTeacherClassification(teacherId: string, isPrivate: boolean): Promise<TeacherResult> {
  const response = await fetch(`${API_BASE}/${teacherId}/classification`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ isPrivate }),
  });
  const result = await handleResponse<TeacherResult>(response);
  clearTeachersCache();
  return result;
}
