import { clearTokens, storeTokens, getRefreshToken, isAuthenticated } from './token-storage';

const API_BASE = '/api/auth';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new AuthError(
      body.error ?? `HTTP ${response.status}`,
      response.status,
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });

  const result = await handleResponse<AuthResult>(response);
  storeTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.accessTokenExpiresAt,
  });
  return result;
}

export async function refreshToken(): Promise<AuthResult> {
  const token = getRefreshToken();
  if (!token) throw new AuthError('No refresh token available', 401);

  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const result = await handleResponse<AuthResult>(response);
  storeTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.accessTokenExpiresAt,
  });
  return result;
}

export async function logout(): Promise<void> {
  const token = getRefreshToken();
  if (!token) {
    clearTokens();
    return;
  }

  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } finally {
    clearTokens();
  }
}

export async function completeRegistration(
  inviteToken: string,
  newPassword: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/complete-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteToken, newPassword }),
  });

  await handleResponse<void>(response);
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  await handleResponse<void>(response);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  await handleResponse<void>(response);
}

export { isAuthenticated };
