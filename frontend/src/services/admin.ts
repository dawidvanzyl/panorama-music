import { getAccessToken } from './token-storage';

const API_BASE = '/api/users';

export interface GetUserResult {
  userId: string;
  email: string;
  roles: string[];
  isActive: boolean;
  isProtected: boolean;
  hasCompletedRegistration: boolean;
}

export interface CreateUserResult {
  userId: string;
  inviteUrl: string;
}

export interface UpdateUserRolesResult {
  userId: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface RegenerateInviteTokenResult {
  inviteUrl: string;
}

export class AdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AdminError';
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
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new AdminError(
      body.error ?? `HTTP ${response.status}`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

let _usersCache: GetUserResult[] | null = null;

export function clearUsersCache(): void {
  _usersCache = null;
}

export async function getUsers(): Promise<GetUserResult[]> {
  if (_usersCache) return _usersCache;
  const response = await fetch(API_BASE, {
    headers: authHeaders(),
  });
  _usersCache = await handleResponse<GetUserResult[]>(response);
  return _usersCache;
}

export async function createUser(email: string, roles: string[]): Promise<CreateUserResult> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, roles }),
  });
  const result = await handleResponse<CreateUserResult>(response);
  _usersCache = null;
  return result;
}

export async function updateUserRoles(userId: string, roles: string[]): Promise<UpdateUserRolesResult> {
  const response = await fetch(`${API_BASE}/${userId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ roles }),
  });
  const result = await handleResponse<UpdateUserRolesResult>(response);
  _usersCache = null;
  return result;
}

export async function regenerateInvite(userId: string): Promise<RegenerateInviteTokenResult> {
  const response = await fetch(`${API_BASE}/${userId}/invite`, {
    method: 'POST',
    headers: authHeaders(),
  });

  return handleResponse<RegenerateInviteTokenResult>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new AdminError(body.error ?? `HTTP ${response.status}`, response.status);
  }
  _usersCache = null;
}
