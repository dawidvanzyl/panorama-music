import { assertOk, authHeaders } from '../../../services/api-client';

const API_BASE = '/api/auth';

export interface SessionResult {
  tokenId: string;
  sessionStartedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
}

export interface AdminSessionResult extends SessionResult {
  userId: string;
  userEmail: string;
  userRoles: string[];
}

export class SessionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response, SessionError);
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function getOwnSessions(): Promise<SessionResult[]> {
  const response = await fetch(`${API_BASE}/sessions`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  return handleResponse<SessionResult[]>(response);
}

export async function revokeOwnSession(tokenId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sessions/${tokenId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  return handleResponse<void>(response);
}

export async function revokeOwnOtherSessions(): Promise<void> {
  const response = await fetch(`${API_BASE}/sessions/others`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  return handleResponse<void>(response);
}

export async function getAllSessions(): Promise<AdminSessionResult[]> {
  const response = await fetch(`${API_BASE}/admin/sessions`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  return handleResponse<AdminSessionResult[]>(response);
}

export async function revokeSession(tokenId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/sessions/${tokenId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  return handleResponse<void>(response);
}

export async function revokeAllSessions(): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/sessions/all`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  return handleResponse<void>(response);
}
