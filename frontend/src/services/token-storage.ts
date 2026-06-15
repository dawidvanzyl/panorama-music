const ACCESS_TOKEN_KEY = 'pm_access_token';
const REFRESH_TOKEN_KEY = 'pm_refresh_token';
const EXPIRES_AT_KEY = 'pm_expires_at';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export function storeTokens(data: TokenData): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(EXPIRES_AT_KEY, data.expiresAt);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const roles = decoded.roles;
    if (typeof roles !== 'string') return [];
    return roles.split(',').map((role: string) => role.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function hasRole(role: string): boolean {
  return getRoles().includes(role);
}
