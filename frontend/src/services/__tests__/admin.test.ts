import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUsers, createUser, regenerateInvite, AdminError } from '../admin';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('getUsers', () => {
  it('returns the list of users', async () => {
    const users = [
      { userId: 'u1', email: 'admin@test.com', roles: ['Admin'], isActive: true },
      { userId: 'u2', email: 'teacher@test.com', roles: ['Teacher'], isActive: false },
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
});

describe('createUser', { tags: ['M1UC48'] }, () => {
  it('creates a user and returns the invite URL', async () => {
    localStorage.setItem('pm_access_token', 'admin-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ userId: 'new-user-id', inviteUrl: '/#/register?token=abc123' }),
    });

    const result = await createUser('new@test.com', 'Teacher');

    expect(result.inviteUrl).toBe('/#/register?token=abc123');
    expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      body: JSON.stringify({ email: 'new@test.com', role: 'Teacher' }),
    }));
  });

  it('throws AdminError when the email already exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'A user with this email already exists.' }),
    });

    await expect(createUser('existing@test.com', 'Admin')).rejects.toThrow(AdminError);
  });
});

describe('regenerateInvite', { tags: ['M1UC49'] }, () => {
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
