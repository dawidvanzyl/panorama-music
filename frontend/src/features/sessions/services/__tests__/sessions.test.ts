import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOwnSessions,
  revokeOwnSession,
  revokeOwnOtherSessions,
  getAllSessions,
  revokeSession,
  revokeAllSessions,
  SessionError,
} from '../sessions';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('getOwnSessions', { tags: ['M1.4UC6'] }, () => {
  it('returns the caller own sessions with the current session identifiable', async () => {
    const sessions = [
      { tokenId: 's1', sessionStartedAt: '2024-01-01', lastSeenAt: '2024-01-02', expiresAt: '2024-01-08', deviceLabel: 'Chrome', ipAddress: '1.2.3.4', isCurrent: true },
      { tokenId: 's2', sessionStartedAt: '2024-01-01', lastSeenAt: '2024-01-01', expiresAt: '2024-01-08', deviceLabel: 'Firefox', ipAddress: '1.2.3.5', isCurrent: false },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => sessions,
    });

    const result = await getOwnSessions();

    expect(result).toEqual(sessions);
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/sessions', expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('throws SessionError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(getOwnSessions()).rejects.toThrow(SessionError);
  });

  it('clears tokens and redirects to login when the session is no longer valid', async () => {
    localStorage.setItem('pm_access_token', 'stale-token');
    window.location.hash = '#/sessions';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(getOwnSessions()).rejects.toThrow(SessionError);

    expect(localStorage.getItem('pm_access_token')).toBeNull();
    expect(window.location.hash).toBe('#/login');
  });
});

describe('revokeOwnSession / revokeOwnOtherSessions', { tags: ['M1.4UC7'] }, () => {
  it('revokes a single own session by id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    await revokeOwnSession('s2');

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/sessions/s2', expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    }));
  });

  it('revokes every other own session in one call', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    await revokeOwnOtherSessions();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/sessions/others', expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    }));
  });
});

describe('getAllSessions', { tags: ['M1.4UC8'] }, () => {
  it('returns sessions across every user with the owning user identified', async () => {
    const sessions = [
      { tokenId: 's1', userId: 'u1', userEmail: 'a@test.com', userRoles: ['Admin'], sessionStartedAt: '2024-01-01', lastSeenAt: '2024-01-01', expiresAt: '2024-01-08', deviceLabel: null, ipAddress: null, isCurrent: true },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => sessions,
    });

    const result = await getAllSessions();

    expect(result).toEqual(sessions);
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/admin/sessions', expect.objectContaining({
      credentials: 'include',
    }));
  });
});

describe('revokeSession / revokeAllSessions', { tags: ['M1.4UC9'] }, () => {
  it('revokes a specific session as admin', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    await revokeSession('s1');

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/admin/sessions/s1', expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    }));
  });

  it('revokes every session system-wide except the admin own current one', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    await revokeAllSessions();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/admin/sessions/all', expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    }));
  });
});
