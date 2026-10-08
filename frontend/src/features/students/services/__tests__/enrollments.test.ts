import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enrollStudent, updateEnrollment, withdrawEnrollment } from '../enrollments';
import { getStudents, clearStudentsCache, type RosterStudentResult } from '../students';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const alice: RosterStudentResult = {
  studentId: 's1',
  firstName: 'Alice',
  lastName: 'Vance',
  dateOfBirth: '2014-05-12',
  grade: 'Grade4',
  class: 'A1',
  phase: 'Junior',
  language: 'English',
  teacherIds: [],
};

const input = {
  courseId: 'c1',
  teacherId: 't1',
  instrumentType: null,
  stepType: null,
  enrolledDate: '2026-08-16',
};

async function primeRosterCache(): Promise<void> {
  mockFetch.mockReset();
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });
  await getStudents();
  mockFetch.mockClear();
}

async function rosterIsFetchedAgain(): Promise<boolean> {
  mockFetch.mockClear();
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [alice] });
  await getStudents();
  return mockFetch.mock.calls.length === 1;
}

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  clearStudentsCache();
});

describe('enrollment writes invalidate the cached roster', { tags: ['341UC9'] }, () => {
  it('enrolling a student makes the next roster read fetch again', async () => {
    await primeRosterCache();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await enrollStudent('s1', input);

    expect(await rosterIsFetchedAgain()).toBe(true);
  });

  it('correcting an enrollment makes the next roster read fetch again', async () => {
    await primeRosterCache();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await updateEnrollment('s1', 'sc1', { teacherId: 't2', instrumentType: null, stepType: null });

    expect(await rosterIsFetchedAgain()).toBe(true);
  });

  it('withdrawing an enrollment makes the next roster read fetch again', async () => {
    await primeRosterCache();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await withdrawEnrollment('s1', 'sc1');

    expect(await rosterIsFetchedAgain()).toBe(true);
  });

  it('a refused enrollment leaves the cached roster in place', async () => {
    await primeRosterCache();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'No' }) });

    await expect(enrollStudent('s1', input)).rejects.toThrow();

    expect(await rosterIsFetchedAgain()).toBe(false);
  });
});
