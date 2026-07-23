import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getSiblings,
  addSibling,
  removeSibling,
  clearStudentsCache,
  StudentsError,
  type StudentResult,
} from '../students';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const alice: StudentResult = {
  studentId: 's1',
  firstName: 'Alice',
  lastName: 'Vance',
  dateOfBirth: '2014-05-12',
  grade: 'Grade4',
  class: 'A1',
  phase: 'Junior',
  language: 'English',
};

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  clearStudentsCache();
});

describe('getStudents', { tags: ['200UC8'] }, () => {
  it('returns the full list of students', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });

    const result = await getStudents();

    expect(result).toEqual([alice]);
    expect(mockFetch).toHaveBeenCalledWith('/api/students', expect.objectContaining({ headers: expect.any(Object) }));
  });

  it('returns a cached result and does not fetch again on a second call', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });

    const first = await getStudents();
    const second = await getStudents();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('throws StudentsError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) });

    await expect(getStudents()).rejects.toThrow(StudentsError);
  });
});

describe('createStudent', { tags: ['200UC10'] }, () => {
  it('posts the input and invalidates the students cache', async () => {
    localStorage.setItem('pm_access_token', 'teacher-token');
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => alice })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });

    await getStudents();
    const result = await createStudent({
      firstName: 'Alice',
      lastName: 'Vance',
      dateOfBirth: '2014-05-12',
      grade: 'Grade4',
      class: 'A1',
      phase: 'Junior',
      language: 'English',
    });
    await getStudents();

    expect(result).toEqual(alice);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/api/students',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer teacher-token' }),
      }),
    );
  });

  it('throws StudentsError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'First name is required' }),
    });

    await expect(
      createStudent({
        firstName: '',
        lastName: 'Vance',
        dateOfBirth: '2014-05-12',
        grade: 'Grade4',
        class: 'A1',
        phase: 'Junior',
        language: 'English',
      }),
    ).rejects.toThrow('First name is required');
  });
});

describe('updateStudent', { tags: ['200UC11'] }, () => {
  it('sends a PUT request and invalidates the students cache', async () => {
    const updated = { ...alice, grade: 'Grade5' as const };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => updated });

    const result = await updateStudent('s1', {
      firstName: alice.firstName,
      lastName: alice.lastName,
      dateOfBirth: alice.dateOfBirth,
      grade: 'Grade5',
      class: alice.class,
      phase: alice.phase,
      language: alice.language,
    });

    expect(result.grade).toBe('Grade5');
    expect(mockFetch).toHaveBeenCalledWith('/api/students/s1', expect.objectContaining({ method: 'PUT' }));
  });
});

describe('deleteStudent', { tags: ['200UC12'] }, () => {
  it('sends a DELETE request and invalidates the students cache', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await deleteStudent('s1');

    expect(mockFetch).toHaveBeenCalledWith('/api/students/s1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('throws StudentsError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'Student not found.' }) });

    await expect(deleteStudent('unknown-id')).rejects.toThrow('Student not found.');
  });
});

const julian: StudentResult = {
  studentId: 's2',
  firstName: 'Julian',
  lastName: 'Thorne',
  dateOfBirth: '2013-09-05',
  grade: 'Grade5',
  class: 'E1',
  phase: 'Senior',
  language: 'Afrikaans',
};

describe('getSiblings', { tags: ['201UC7'] }, () => {
  it('returns the students currently linked as siblings', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [julian] });

    const result = await getSiblings('s1');

    expect(result).toEqual([julian]);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/students/s1/siblings',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('re-fetches on every call rather than caching', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [julian] });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });

    const first = await getSiblings('s1');
    const second = await getSiblings('s1');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(first).toEqual([julian]);
    expect(second).toEqual([]);
  });

  it('throws StudentsError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'Student not found.' }) });

    await expect(getSiblings('unknown-id')).rejects.toThrow(StudentsError);
  });
});

describe('addSibling', { tags: ['201UC8'] }, () => {
  it('posts the sibling id and the new sibling is reflected on the next getSiblings call', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => julian })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [julian] });

    const result = await addSibling('s1', 's2');
    const siblings = await getSiblings('s1');

    expect(result).toEqual(julian);
    expect(siblings).toEqual([julian]);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/students/s1/siblings',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ siblingId: 's2' }) }),
    );
  });

  it('throws StudentsError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'A student cannot be linked as their own sibling.' }),
    });

    await expect(addSibling('s1', 's1')).rejects.toThrow('A student cannot be linked as their own sibling.');
  });
});

describe('removeSibling', { tags: ['201UC9'] }, () => {
  it('sends a DELETE request and the sibling no longer appears on the next getSiblings call', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });

    await removeSibling('s1', 's2');
    const siblings = await getSiblings('s1');

    expect(siblings).toEqual([]);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/students/s1/siblings/s2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws StudentsError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Sibling link not found.' }),
    });

    await expect(removeSibling('s1', 'unknown-id')).rejects.toThrow('Sibling link not found.');
  });
});
