import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacherProfile,
  updateTeacherClassification,
  clearTeachersCache,
  TeachersError,
  type TeacherResult,
} from '../teachers';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const alice: TeacherResult = {
  teacherId: 't1',
  firstName: 'Alice',
  surname: 'Vance',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
  banking: null,
};

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  clearTeachersCache();
});

describe('getTeachers', { tags: ['231UC7'] }, () => {
  it('returns the full list of teachers', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });

    const result = await getTeachers();

    expect(result).toEqual([alice]);
    expect(mockFetch).toHaveBeenCalledWith('/api/teachers', expect.objectContaining({ headers: expect.any(Object) }));
  });

  it('returns a cached result and does not fetch again on a second call', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });

    const first = await getTeachers();
    const second = await getTeachers();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('throws TeachersError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) });

    await expect(getTeachers()).rejects.toThrow(TeachersError);
  });
});

describe('getTeacherById', () => {
  it('returns a single teacher', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => alice });

    const result = await getTeacherById('t1');

    expect(result).toEqual(alice);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/teachers/t1',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});

describe('createTeacher', () => {
  it('posts the input and invalidates the teachers cache', async () => {
    localStorage.setItem('pm_access_token', 'coordinator-token');
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => alice })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });

    await getTeachers();
    const result = await createTeacher({ firstName: 'Alice', surname: 'Vance', isPrivate: false });
    await getTeachers();

    expect(result).toEqual(alice);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/api/teachers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer coordinator-token' }),
      }),
    );
  });

  it('throws TeachersError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'First name is required' }),
    });

    await expect(createTeacher({ firstName: '', surname: 'Vance', isPrivate: false })).rejects.toThrow(
      'First name is required',
    );
  });
});

describe('updateTeacherProfile', () => {
  it('sends the names only to the profile endpoint', async () => {
    const updated = { ...alice, firstName: 'Alicia' };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => updated });

    const result = await updateTeacherProfile('t1', { firstName: 'Alicia', surname: 'Vance' });

    expect(result.firstName).toBe('Alicia');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/teachers/t1/profile',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ firstName: 'Alicia', surname: 'Vance' }),
      }),
    );
  });
});

describe('updateTeacherClassification', () => {
  it('sends the flag only to the classification endpoint', async () => {
    const updated = { ...alice, isPrivate: true };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => updated });

    const result = await updateTeacherClassification('t1', true);

    expect(result.isPrivate).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/teachers/t1/classification',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ isPrivate: true }) }),
    );
  });

  it('throws TeachersError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Save failed' }) });

    await expect(updateTeacherClassification('t1', true)).rejects.toThrow('Save failed');
  });
});
