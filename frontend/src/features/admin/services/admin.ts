import { assertOk, authHeaders, handleResponse } from '../../../services/api-client';
import { registerSessionCache } from '../../../services/session-cache';

const API_BASE = '/api/users';

export type UserRole = 'Teacher' | 'Coordinator' | 'Admin' | 'BankingCoordinator';

export const ALL_ROLES: readonly UserRole[] = ['Teacher', 'Coordinator', 'Admin', 'BankingCoordinator'];

const ROLE_LABELS: Record<UserRole, string> = {
  Teacher: 'Teacher',
  Coordinator: 'Coordinator',
  Admin: 'Admin',
  BankingCoordinator: 'Banking Coordinator',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

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

let _usersCache: GetUserResult[] | null = null;

export function clearUsersCache(): void {
  _usersCache = null;
}

registerSessionCache(clearUsersCache);

export async function getUsers(): Promise<GetUserResult[]> {
  if (_usersCache) return _usersCache;
  const response = await fetch(API_BASE, {
    headers: authHeaders(),
  });
  _usersCache = await handleResponse<GetUserResult[]>(response, AdminError);
  return _usersCache;
}

export async function createUser(email: string, roles: UserRole[]): Promise<CreateUserResult> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, roles }),
  });
  const result = await handleResponse<CreateUserResult>(response, AdminError);
  _usersCache = null;
  return result;
}

export async function updateUserRoles(userId: string, roles: UserRole[]): Promise<UpdateUserRolesResult> {
  const response = await fetch(`${API_BASE}/${userId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ roles }),
  });
  const result = await handleResponse<UpdateUserRolesResult>(response, AdminError);
  _usersCache = null;
  return result;
}

export async function regenerateInvite(userId: string): Promise<RegenerateInviteTokenResult> {
  const response = await fetch(`${API_BASE}/${userId}/invite`, {
    method: 'POST',
    headers: authHeaders(),
  });

  return handleResponse<RegenerateInviteTokenResult>(response, AdminError);
}

export async function deactivateUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${userId}/deactivate`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  await assertOk(response, AdminError);
  _usersCache = null;
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await assertOk(response, AdminError);
  _usersCache = null;
}

export async function activateUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${userId}/activate`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  await assertOk(response, AdminError);
  _usersCache = null;
}
