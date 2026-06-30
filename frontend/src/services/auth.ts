import { clearTokens, storeTokens, getAccessToken, isAuthenticated } from './token-storage';

const API_BASE = '/api/auth';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresAt: string;
}

export type LoginOutcome =
  | { status: 'success'; accessToken: string; accessTokenExpiresAt: string }
  | { status: 'passwordResetRequired'; resetToken: string };

export interface ValidationError {
  propertyName: string;
  errorMessage: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public validationErrors: ValidationError[] = [],
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    if (Array.isArray(body)) {
      const validationErrors = body as ValidationError[];
      const message = validationErrors.map((e) => e.errorMessage).join(' ') || 'Request failed';
      throw new AuthError(message, response.status, validationErrors);
    }
    throw new AuthError(body.error ?? `HTTP ${response.status}`, response.status);
  }
  if (response.status === 202 || response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<LoginOutcome> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });

  if (response.status === 403) {
    const body = await response.json().catch(() => null);
    if (body && body.passwordResetRequired === true && typeof body.resetToken === 'string') {
      return { status: 'passwordResetRequired', resetToken: body.resetToken };
    }
    throw new AuthError(body?.error ?? `HTTP ${response.status}`, response.status);
  }

  const result = await handleResponse<AuthResult>(response);
  storeTokens({
    accessToken: result.accessToken,
    expiresAt: result.accessTokenExpiresAt,
  });
  return { status: 'success', accessToken: result.accessToken, accessTokenExpiresAt: result.accessTokenExpiresAt };
}

export async function refreshToken(): Promise<AuthResult> {
  // The refresh token travels in an HttpOnly cookie the browser attaches
  // automatically — there is nothing for the frontend to read or send here.
  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  const result = await handleResponse<AuthResult>(response);
  storeTokens({
    accessToken: result.accessToken,
    expiresAt: result.accessTokenExpiresAt,
  });
  return result;
}

export async function logout(): Promise<void> {
  const accessToken = getAccessToken();

  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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

export type RefreshOutcome = 'ok' | 'rejected' | 'failed';

let pendingRefresh: Promise<RefreshOutcome> | null = null;

export function tryRefresh(): Promise<RefreshOutcome> {
  if (!pendingRefresh) {
    pendingRefresh = refreshToken()
      .then((): RefreshOutcome => 'ok')
      .catch((err: unknown): RefreshOutcome => {
        if (err instanceof AuthError && err.status === 401) {
          clearTokens();
          return 'rejected';
        }
        console.error('Unexpected error refreshing session', err);
        return 'failed';
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
}

export { isAuthenticated };
