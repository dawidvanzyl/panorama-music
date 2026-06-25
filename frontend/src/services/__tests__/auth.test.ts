import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, logout, completeRegistration, refreshToken, isAuthenticated, tryRefresh } from '../auth';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

const validAuthResult = {
  accessToken: 'jwt-token-123',
  refreshToken: 'refresh-token-456',
  accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
  refreshTokenExpiresAt: new Date(Date.now() + 604800000).toISOString(),
};

describe('login', { tags: ['M1UC35'] }, () => {
  it('stores tokens in localStorage on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => validAuthResult,
    });

    const result = await login('test@example.com', 'password123');

    expect(result.accessToken).toBe('jwt-token-123');
    expect(result.refreshToken).toBe('refresh-token-456');
    expect(localStorage.getItem('pm_access_token')).toBe('jwt-token-123');
    expect(localStorage.getItem('pm_refresh_token')).toBe('refresh-token-456');
  });

  it('throws AuthError on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    await expect(login('test@example.com', 'wrongpass')).rejects.toThrow('Invalid credentials');
    expect(localStorage.getItem('pm_access_token')).toBeNull();
  });
});

describe('refreshToken', { tags: ['M1UC37'] }, () => {
  it('stores new tokens on success', async () => {
    localStorage.setItem('pm_refresh_token', 'old-refresh-token');

    const newResult = {
      ...validAuthResult,
      accessToken: 'new-jwt-token',
      refreshToken: 'new-refresh-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => newResult,
    });

    const result = await refreshToken();

    expect(result.accessToken).toBe('new-jwt-token');
    expect(localStorage.getItem('pm_access_token')).toBe('new-jwt-token');
    expect(localStorage.getItem('pm_refresh_token')).toBe('new-refresh-token');
  });

  it('throws when no refresh token is stored', async () => {
    await expect(refreshToken()).rejects.toThrow('No refresh token available');
  });
});

describe('logout', { tags: ['M1UC38'] }, () => {
  it('calls logout endpoint and clears tokens', async () => {
    localStorage.setItem('pm_refresh_token', 'some-token');
    localStorage.setItem('pm_access_token', 'some-access');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await logout();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'some-token' }),
    }));
    expect(localStorage.getItem('pm_access_token')).toBeNull();
    expect(localStorage.getItem('pm_refresh_token')).toBeNull();
  });

  it('clears tokens even if the endpoint fails', async () => {
    localStorage.setItem('pm_refresh_token', 'some-token');
    localStorage.setItem('pm_access_token', 'some-access');

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(logout()).rejects.toThrow('Network error');

    expect(localStorage.getItem('pm_access_token')).toBeNull();
    expect(localStorage.getItem('pm_refresh_token')).toBeNull();
  });

  it('clears tokens when no refresh token exists', async () => {
    localStorage.setItem('pm_access_token', 'orphan-token');

    await logout();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(localStorage.getItem('pm_access_token')).toBeNull();
  });
});

describe('completeRegistration', { tags: ['M1UC36'] }, () => {
  it('calls endpoint and does not store tokens', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await completeRegistration('invite-token-abc', 'StrongPass1!');

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/complete-registration', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ inviteToken: 'invite-token-abc', newPassword: 'StrongPass1!' }),
    }));
    expect(localStorage.getItem('pm_access_token')).toBeNull();
  });

  it('throws on invalid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invite link is invalid or expired' }),
    });

    await expect(completeRegistration('bad-token', 'Pass123!')).rejects.toThrow('Invite link is invalid or expired');
  });
});

describe('tryRefresh', () => {
  it('resolves "ok" and stores new tokens when refresh succeeds', async () => {
    localStorage.setItem('pm_refresh_token', 'old-refresh-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...validAuthResult, accessToken: 'rotated-token' }),
    });

    const outcome = await tryRefresh();

    expect(outcome).toBe('ok');
    expect(localStorage.getItem('pm_access_token')).toBe('rotated-token');
  });

  it('resolves "rejected" and clears tokens when the refresh token is invalid/expired/revoked', async () => {
    localStorage.setItem('pm_refresh_token', 'dead-refresh-token');
    localStorage.setItem('pm_access_token', 'stale-access-token');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid or expired refresh token' }),
    });

    const outcome = await tryRefresh();

    expect(outcome).toBe('rejected');
    expect(localStorage.getItem('pm_access_token')).toBeNull();
    expect(localStorage.getItem('pm_refresh_token')).toBeNull();
  });

  it('resolves "failed" and does not clear tokens on an unexpected/network error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('pm_refresh_token', 'still-valid-refresh-token');
    localStorage.setItem('pm_access_token', 'stale-access-token');

    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const outcome = await tryRefresh();

    expect(outcome).toBe('failed');
    expect(localStorage.getItem('pm_access_token')).toBe('stale-access-token');
    expect(localStorage.getItem('pm_refresh_token')).toBe('still-valid-refresh-token');
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('dedupes concurrent calls into a single in-flight request', async () => {
    localStorage.setItem('pm_refresh_token', 'old-refresh-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => validAuthResult,
    });

    const [first, second] = await Promise.all([tryRefresh(), tryRefresh()]);

    expect(first).toBe('ok');
    expect(second).toBe('ok');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('isAuthenticated', { tags: ['M1UC39'] }, () => {
  it('returns true when valid token exists', () => {
    localStorage.setItem('pm_access_token', 'token');
    localStorage.setItem('pm_expires_at', new Date(Date.now() + 3600000).toISOString());

    expect(isAuthenticated()).toBe(true);
  });

  it('returns false when no token exists', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns false when token is expired', () => {
    localStorage.setItem('pm_access_token', 'token');
    localStorage.setItem('pm_expires_at', new Date(Date.now() - 3600000).toISOString());

    expect(isAuthenticated()).toBe(false);
  });
});
