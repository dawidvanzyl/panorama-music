import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, logout, completeRegistration, refreshToken, isAuthenticated, tryRefresh, AuthError } from '../auth';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

const validAuthResult = {
  accessToken: 'jwt-token-123',
  accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
};

describe('login', { tags: ['M1UC35'] }, () => {
  it('stores the access token in localStorage and sends credentials for the refresh-token cookie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => validAuthResult,
    });

    const result = await login('test@example.com', 'password123');

    expect(result.status).toBe('success');
    expect(result).toMatchObject({ accessToken: 'jwt-token-123' });
    expect(localStorage.getItem('pm_access_token')).toBe('jwt-token-123');
    expect(localStorage.getItem('pm_refresh_token')).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
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

  it('returns a passwordResetRequired outcome on 403 without storing tokens', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ passwordResetRequired: true, resetToken: 'reset-tok-abc' }),
    });

    const result = await login('admin@test.com', 'password123');

    expect(result).toEqual({ status: 'passwordResetRequired', resetToken: 'reset-tok-abc' });
    expect(localStorage.getItem('pm_access_token')).toBeNull();
  });

  it('throws AuthError on a malformed 403 body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ passwordResetRequired: false }),
    });

    await expect(login('admin@test.com', 'password123')).rejects.toThrow(AuthError);
    expect(localStorage.getItem('pm_access_token')).toBeNull();
  });
});

describe('refreshToken', { tags: ['M1UC37'] }, () => {
  it('stores the new access token on success without sending a token client-side', async () => {
    const newResult = { ...validAuthResult, accessToken: 'new-jwt-token' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => newResult,
    });

    const result = await refreshToken();

    expect(result.accessToken).toBe('new-jwt-token');
    expect(localStorage.getItem('pm_access_token')).toBe('new-jwt-token');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('throws AuthError when the server has no valid refresh-token cookie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid or expired refresh token' }),
    });

    await expect(refreshToken()).rejects.toThrow('Invalid or expired refresh token');
  });
});

describe('logout', { tags: ['M1UC38'] }, () => {
  it('calls the logout endpoint with the access token and clears local storage', async () => {
    localStorage.setItem('pm_access_token', 'some-access');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await logout();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: 'Bearer some-access' },
      }),
    );
    expect(localStorage.getItem('pm_access_token')).toBeNull();
  });

  it('clears tokens even if the endpoint fails', async () => {
    localStorage.setItem('pm_access_token', 'some-access');

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(logout()).rejects.toThrow('Network error');

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

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/complete-registration',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ inviteToken: 'invite-token-abc', newPassword: 'StrongPass1!' }),
      }),
    );
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

describe('tryRefresh', { tags: ['M1.2UC1'] }, () => {
  it('resolves "ok" and stores the new access token when refresh succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...validAuthResult, accessToken: 'rotated-token' }),
    });

    const outcome = await tryRefresh();

    expect(outcome).toBe('ok');
    expect(localStorage.getItem('pm_access_token')).toBe('rotated-token');
  });

  it('resolves "rejected" and clears tokens when there is no valid refresh-token cookie', async () => {
    localStorage.setItem('pm_access_token', 'stale-access-token');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid or expired refresh token' }),
    });

    const outcome = await tryRefresh();

    expect(outcome).toBe('rejected');
    expect(localStorage.getItem('pm_access_token')).toBeNull();
  });

  it('resolves "failed" and does not clear tokens on a non-401 server error (e.g. a transient 5xx)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('pm_access_token', 'stale-access-token');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    const outcome = await tryRefresh();

    expect(outcome).toBe('failed');
    expect(localStorage.getItem('pm_access_token')).toBe('stale-access-token');
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('resolves "failed" and does not clear tokens on an unexpected/network error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('pm_access_token', 'stale-access-token');

    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const outcome = await tryRefresh();

    expect(outcome).toBe('failed');
    expect(localStorage.getItem('pm_access_token')).toBe('stale-access-token');
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('dedupes concurrent calls into a single in-flight request', async () => {
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
