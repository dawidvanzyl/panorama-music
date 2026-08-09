import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';

const API_BASE = '/api/teachers';

export type Bank = 'StandardBank' | 'Fnb' | 'Nedbank' | 'Absa' | 'Capitec';

export type BankAccountType = 'ChequeCurrent' | 'Savings';

/**
 * A teacher's banking details as the server returns them anywhere but the
 * reveal endpoint. There is no account-number field — only its last four
 * digits — so no view built from this type can render the full value.
 */
export interface BankingDetails {
  bank: Bank;
  accountType: BankAccountType;
  branchCode: string;
  accountNumberLast4: string;
}

export interface BankingDetailsInput {
  bank: Bank;
  accountType: BankAccountType;
  branchCode: string;
  /**
   * Omitted on an edit that keeps the stored number. The stored one cannot be
   * read back into the form, so absence is how "unchanged" is expressed.
   */
  accountNumber?: string;
}

export interface BankingActivityEntry {
  occurredAt: string;
  eventType: string;
  actorEmail: string | null;
  accountNumberLast4: string | null;
}

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
  /** Null when none have been captured — valid for any teacher. */
  banking: BankingDetails | null;
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

export async function createBankingDetails(teacherId: string, input: BankingDetailsInput): Promise<BankingDetails> {
  const response = await fetch(`${API_BASE}/${teacherId}/banking`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<BankingDetails>(response);
  clearTeachersCache();
  return result;
}

export async function updateBankingDetails(teacherId: string, input: BankingDetailsInput): Promise<BankingDetails> {
  const response = await fetch(`${API_BASE}/${teacherId}/banking`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const result = await handleResponse<BankingDetails>(response);
  clearTeachersCache();
  return result;
}

export async function deleteBankingDetails(teacherId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${teacherId}/banking`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
  clearTeachersCache();
}

/**
 * Returns the full account number. The one call in this service that does, and
 * the server records an audit entry against the caller for making it — so it is
 * issued only when someone explicitly asks to see the number, never as part of
 * loading a record.
 */
export async function revealAccountNumber(teacherId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/${teacherId}/banking/reveal`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const result = await handleResponse<{ accountNumber: string }>(response);
  return result.accountNumber;
}

/** Never cached — the point of the view is to show what has just happened. */
export async function getBankingActivity(teacherId: string): Promise<BankingActivityEntry[]> {
  const response = await fetch(`${API_BASE}/${teacherId}/banking/activity`, { headers: authHeaders() });
  return handleResponse<BankingActivityEntry[]>(response);
}

/**
 * Takes a teacher out of active service. The server deletes their banking
 * details in the same operation, so the returned record comes back with none.
 */
export async function deactivateTeacher(teacherId: string): Promise<TeacherResult> {
  const response = await fetch(`${API_BASE}/${teacherId}/deactivate`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const result = await handleResponse<TeacherResult>(response);
  clearTeachersCache();
  return result;
}

/** Returns a deactivated teacher to active — without their deleted banking details. */
export async function reactivateTeacher(teacherId: string): Promise<TeacherResult> {
  const response = await fetch(`${API_BASE}/${teacherId}/reactivate`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const result = await handleResponse<TeacherResult>(response);
  clearTeachersCache();
  return result;
}

/** Permanently removes the record. The server refuses this while the teacher is active. */
export async function deleteTeacher(teacherId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${teacherId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
  clearTeachersCache();
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
