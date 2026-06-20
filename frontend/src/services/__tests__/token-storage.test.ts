import { describe, it, expect, beforeEach } from 'vitest';
import { storeTokens, isAuthenticated, getRoles, hasRole } from '../token-storage';

beforeEach(() => {
  localStorage.clear();
});

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildJwt(roles: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ sub: 'user-id', roles }));
  return `${header}.${payload}.signature`;
}

describe('isAuthenticated', { tags: ['M1UC48'] }, () => {
  it('returns false when no token is stored, indicating a redirect to login is required', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true once tokens are stored with a future expiry', () => {
    storeTokens({
      accessToken: buildJwt('Admin'),
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(isAuthenticated()).toBe(true);
  });
});

describe('getRoles / hasRole', { tags: ['M1UC48'] }, () => {
  it('returns an empty list when no token is stored', () => {
    expect(getRoles()).toEqual([]);
    expect(hasRole('Admin')).toBe(false);
  });

  it('decodes roles from the access token', () => {
    storeTokens({
      accessToken: buildJwt('Admin,Teacher'),
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(getRoles()).toEqual(['Admin', 'Teacher']);
    expect(hasRole('Admin')).toBe(true);
    expect(hasRole('Teacher')).toBe(true);
  });

  it('returns false for a role the user does not have', () => {
    storeTokens({
      accessToken: buildJwt('Teacher'),
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(hasRole('Admin')).toBe(false);
  });
});
