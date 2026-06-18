import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUsers, createUser, updateUserRoles, regenerateInvite, deleteUser, clearUsersCache, AdminError } from '../admin';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  clearUsersCache();
});

describe('getUsers', { tags: ['M1UC49'] }, () => {
  it('returns the list of users', async () => {
    const users = [
      { userId: 'u1', email: 'admin@test.com', roles: ['Admin'], isActive: true, isProtected: false },
      { userId: 'u2', email: 'teacher@test.com', roles: ['Teacher'], isActive: false, isProtected: false },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => users,
    });

    const result = await getUsers();

    expect(result).toEqual(users);
    expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('throws AdminError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    await expect(getUsers()).rejects.toThrow('Forbidden');
  });

  it('returns cached result and does not fetch again on second call', async () => {
    const users = [{ userId: 'u1', email: 'admin@test.com', roles: ['Admin'], isActive: true, isProtected: false }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => users,
    });

    const first = await getUsers();
    const second = await getUsers();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});

describe('createUser', { tags: ['M1UC46'] }, () => {
  it('creates a user and returns the invite URL', async () => {
    localStorage.setItem('pm_access_token', 'admin-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ userId: 'new-user-id', inviteUrl: '/#/register?token=abc123' }),
    });

    const result = await createUser('new@test.com', ['Teacher']);

    expect(result.inviteUrl).toBe('/#/register?token=abc123');
    expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      body: JSON.stringify({ email: 'new@test.com', roles: ['Teacher'] }),
    }));
  });

  it('throws AdminError when the email already exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'A user with this email already exists.' }),
    });

    await expect(createUser('existing@test.com', ['Admin'])).rejects.toThrow(AdminError);
  });

  it('invalidates the users cache', async () => {
    const users = [{ userId: 'u1', email: 'admin@test.com', roles: ['Admin'], isActive: true, isProtected: false }];
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => users })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ userId: 'u2', inviteUrl: '/#/register?token=x' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => users });

    await getUsers();
    await createUser('new@test.com', ['Teacher']);
    await getUsers();

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('createUser multi-role', { tags: ['M1.1UC24'] }, () => {
  it('sends all selected roles and returns the invite URL', async () => {
    localStorage.setItem('pm_access_token', 'admin-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ userId: 'new-user-id', inviteUrl: '/#/register?token=multi' }),
    });

    const result = await createUser('multi@test.com', ['Teacher', 'Admin']);

    expect(result.inviteUrl).toBe('/#/register?token=multi');
    expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'multi@test.com', roles: ['Teacher', 'Admin'] }),
    }));
  });
});

describe('updateUserRoles', { tags: ['M1.1UC15'] }, () => {
  it('sends updated roles to PATCH endpoint and returns updated user', async () => {
    localStorage.setItem('pm_access_token', 'admin-token');

    const updated = { userId: 'u1', email: 'teacher@test.com', roles: ['Teacher', 'Admin'], isActive: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updated,
    });

    const result = await updateUserRoles('u1', ['Teacher', 'Admin']);

    expect(result.roles).toEqual(['Teacher', 'Admin']);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/u1', expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      body: JSON.stringify({ roles: ['Teacher', 'Admin'] }),
    }));
  });

  it('throws AdminError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'User not found.' }),
    });

    await expect(updateUserRoles('unknown-id', ['Teacher'])).rejects.toThrow('User not found.');
  });

  it('invalidates the users cache', async () => {
    const users = [{ userId: 'u1', email: 'teacher@test.com', roles: ['Teacher'], isActive: true, isProtected: false }];
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => users })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ userId: 'u1', email: 'teacher@test.com', roles: ['Teacher', 'Admin'], isActive: true, isProtected: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => users });

    await getUsers();
    await updateUserRoles('u1', ['Teacher', 'Admin']);
    await getUsers();

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('getUsers returns current roles for pre-population', { tags: ['M1.1UC14'] }, () => {
  it('returns roles per user so edit mode can pre-check correct roles', async () => {
    const users = [
      { userId: 'u1', email: 'admin@test.com', roles: ['Admin', 'Teacher'], isActive: true, isProtected: false },
      { userId: 'u2', email: 'teacher@test.com', roles: ['Teacher'], isActive: true, isProtected: false },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => users,
    });

    const result = await getUsers();

    expect(result[0].roles).toEqual(['Admin', 'Teacher']);
    expect(result[1].roles).toEqual(['Teacher']);
  });
});

describe('regenerateInvite', { tags: ['M1UC47'] }, () => {
  it('regenerates an invite and returns the new invite URL', async () => {
    localStorage.setItem('pm_access_token', 'admin-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ inviteUrl: '/#/register?token=new-token' }),
    });

    const result = await regenerateInvite('user-id-123');

    expect(result.inviteUrl).toBe('/#/register?token=new-token');
    expect(mockFetch).toHaveBeenCalledWith('/api/users/user-id-123/invite', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
    }));
  });

  it('throws AdminError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'User not found.' }),
    });

    await expect(regenerateInvite('unknown-id')).rejects.toThrow('User not found.');
  });
});

describe('deleteUser', { tags: ['M1.1UC19'] }, () => {
  it('calls DELETE endpoint and invalidates cache on success', async () => {
    localStorage.setItem('pm_access_token', 'admin-token');

    const users = [{ userId: 'u1', email: 'teacher@test.com', roles: ['Teacher'], isActive: true, isProtected: false }];
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => users })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => users });

    await getUsers();
    await deleteUser('u1');
    await getUsers();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/u1', expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
    }));
  });

  it('throws AdminError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    await expect(deleteUser('u1')).rejects.toThrow('Forbidden');
  });
});
