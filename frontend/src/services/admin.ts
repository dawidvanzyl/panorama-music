import { getAccessToken } from './token-storage';

const API_BASE = '/api/users';

export interface AdminUserSummary {
  userId: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface CreateUserResult {
  userId: string;
  inviteUrl: string;
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

export async function getUsers(): Promise<AdminUserSummary[]> {
  const response = await fetch(API_BASE, {
    headers: authHeaders(),
  });

  return handleResponse<AdminUserSummary[]>(response);
}

export async function createUser(email: string, role: string): Promise<CreateUserResult> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, role }),
  });

  return handleResponse<CreateUserResult>(response);
}

export async function regenerateInvite(userId: string): Promise<RegenerateInviteTokenResult> {
  const response = await fetch(`${API_BASE}/${userId}/invite`, {
    method: 'POST',
    headers: authHeaders(),
  });

  return handleResponse<RegenerateInviteTokenResult>(response);
}
