import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';

const STUDENTS_BASE = '/api/students';
const GUARDIANS_BASE = '/api/guardians';
const GUARDIAN_RELATIONSHIPS_BASE = '/api/guardian-relationships';

export interface GuardianResult {
  guardianId: string;
  guardianRelationshipId: string;
  firstName: string;
  surname: string;
  cell: string | null;
  email: string | null;
  receivesCorrespondence: boolean;
  responsibleForPayment: boolean;
  married: boolean;
}

export interface GuardianInput {
  guardianRelationshipId: string;
  firstName: string;
  surname: string;
  cell: string | null;
  email: string | null;
  receivesCorrespondence: boolean;
  responsibleForPayment: boolean;
  married: boolean;
}

export interface GuardianRelationship {
  guardianRelationshipId: string;
  name: string;
}

export class GuardiansError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'GuardiansError';
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
    throw new GuardiansError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

/**
 * A student's guardians change frequently within a single wizard session
 * (add/edit/unlink/sync all refresh the list immediately), so like
 * getSiblings this is a plain, uncached fetch.
 */
export async function getGuardians(studentId: string): Promise<GuardianResult[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/guardians`, { headers: authHeaders() });
  return handleResponse<GuardianResult[]>(response);
}

export async function addGuardian(studentId: string, input: GuardianInput): Promise<GuardianResult> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/guardians`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<GuardianResult>(response);
}

export async function updateGuardian(guardianId: string, input: GuardianInput): Promise<GuardianResult> {
  const response = await fetch(`${GUARDIANS_BASE}/${guardianId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<GuardianResult>(response);
}

/** Unlinks the guardian from this student only; the record and its other sibling links survive. */
export async function unlinkGuardian(studentId: string, guardianId: string): Promise<void> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/guardians/${guardianId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
}

/** Deletes the guardian record and every link to it across the sibling group. */
export async function deleteGuardian(guardianId: string): Promise<void> {
  const response = await fetch(`${GUARDIANS_BASE}/${guardianId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response);
}

/**
 * Whether this guardian is linked to more than one student. In this domain
 * guardians are only ever linked to multiple students via sibling sharing, so
 * this is the definitive answer to "is it actually shared" — not an
 * approximation based on whether the current student merely has siblings.
 */
export async function isGuardianShared(guardianId: string): Promise<boolean> {
  const response = await fetch(`${GUARDIANS_BASE}/${guardianId}/shared`, { headers: authHeaders() });
  return handleResponse<boolean>(response);
}

/** Re-links every sibling-group guardian the student is currently missing. */
export async function syncGuardians(studentId: string): Promise<GuardianResult[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/guardians/sync`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<GuardianResult[]>(response);
}

/**
 * Read-only preview of what syncGuardians would link — guardians held by a
 * sibling but missing from this student — computed server-side in one
 * request instead of the caller fetching every sibling's guardian list.
 */
export async function getMissingSiblingGuardians(studentId: string): Promise<GuardianResult[]> {
  const response = await fetch(`${STUDENTS_BASE}/${studentId}/guardians/missing`, { headers: authHeaders() });
  return handleResponse<GuardianResult[]>(response);
}

let _guardianRelationshipsCache: GuardianRelationship[] | null = null;

export function clearGuardianRelationshipsCache(): void {
  _guardianRelationshipsCache = null;
}

/**
 * Synchronous cache read, with no fetch fallback. Lets a caller open UI that
 * depends on the lookup immediately when it's already warm (the common case,
 * since the page loads it eagerly on mount) while still being able to detect
 * a cold cache and await getGuardianRelationships() instead of rendering an
 * empty dropdown.
 */
export function peekCachedGuardianRelationships(): GuardianRelationship[] | null {
  return _guardianRelationshipsCache;
}

/**
 * Seeded reference data (relationship types) — stable and reusable, so this
 * mirrors getStudents' cache-on-hit pattern. Nothing in the app mutates this
 * lookup, so there is no invalidation call site.
 */
export async function getGuardianRelationships(): Promise<GuardianRelationship[]> {
  if (_guardianRelationshipsCache) return _guardianRelationshipsCache;

  const response = await fetch(GUARDIAN_RELATIONSHIPS_BASE, { headers: authHeaders() });
  _guardianRelationshipsCache = await handleResponse<GuardianRelationship[]>(response);
  return _guardianRelationshipsCache;
}
