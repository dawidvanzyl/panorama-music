import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCourses,
  createCourse,
  updateCourseCost,
  deleteCourse,
  clearCoursesCache,
  CoursesError,
  type Course,
} from '../courses';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const theory: Course = {
  courseId: 'c1',
  courseType: 'Theory',
  cost: '120.00',
  lessonStructureId: 'ls1',
  lessonType: 'Group',
  durationType: 'Hour',
  occurrenceType: 'DuringSchool',
};

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  clearCoursesCache();
});

describe('getCourses', { tags: ['257UC16'] }, () => {
  it('returns the whole catalogue', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [theory] });

    const result = await getCourses();

    expect(result).toEqual([theory]);
    expect(mockFetch).toHaveBeenCalledWith('/api/courses', expect.objectContaining({ headers: expect.any(Object) }));
  });

  it('returns a cached result and does not fetch again on a second call', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [theory] });

    const first = await getCourses();
    const second = await getCourses();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('throws CoursesError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) });

    await expect(getCourses()).rejects.toThrow(CoursesError);
  });
});

describe('createCourse', { tags: ['257UC13'] }, () => {
  it('posts the input and invalidates the courses cache', async () => {
    localStorage.setItem('pm_access_token', 'admin-token');
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [theory] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => theory })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [theory] });

    await getCourses();
    await createCourse({ courseType: 'Theory', cost: '120.00', lessonStructureId: 'ls1' });
    await getCourses();

    // The read after the create is a fresh round trip, not the stale catalogue.
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('sends the cost as the typed text rather than a JSON number', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: async () => theory });

    await createCourse({ courseType: 'Theory', cost: '120.50', lessonStructureId: 'ls1' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cost).toBe('120.50');
  });
});

describe('updateCourseCost', { tags: ['258UC10'] }, () => {
  it('puts the cost as text to the course and invalidates the courses cache', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [theory] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...theory, cost: '150.00' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ ...theory, cost: '150.00' }] });

    await getCourses();
    const updated = await updateCourseCost('c1', '150.00');
    await getCourses();

    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('/api/courses/c1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body).cost).toBe('150.00');
    expect(updated.cost).toBe('150.00');
    // The read after the update is a fresh round trip, not the stale catalogue.
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws CoursesError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'Not found' }) });

    await expect(updateCourseCost('c1', '150.00')).rejects.toThrow(CoursesError);
  });
});

describe('deleteCourse', { tags: ['258UC14'] }, () => {
  it('deletes the course and invalidates the courses cache', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [theory] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });

    await getCourses();
    await deleteCourse('c1');
    await getCourses();

    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('/api/courses/c1');
    expect(init.method).toBe('DELETE');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws CoursesError on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'Not found' }) });

    await expect(deleteCourse('c1')).rejects.toThrow(CoursesError);
  });
});
