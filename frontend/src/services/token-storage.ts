const ACCESS_TOKEN_KEY = 'pm_access_token';
const EXPIRES_AT_KEY = 'pm_expires_at';

export interface TokenData {
  accessToken: string;
  expiresAt: string;
}

export function storeTokens(data: TokenData): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(EXPIRES_AT_KEY, data.expiresAt);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!token || !expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export function getRoles(): string[] {
  const token = getAccessToken();
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const roles = payload.roles as string | undefined;
    return roles ? roles.split(',') : [];
  } catch {
    return [];
  }
}

export function hasRole(role: string): boolean {
  return getRoles().includes(role);
}

export function getUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
