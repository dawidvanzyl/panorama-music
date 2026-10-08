import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAssignableExtraCurricularsByPhase } from '../student-extra-curriculars';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
});

describe('getAssignableExtraCurricularsByPhase', { tags: ['344UC7'] }, () => {
  it('fetches without a query string when there is no phase, asking for every phase', async () => {
    await getAssignableExtraCurricularsByPhase(null);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/students/extra-curriculars/assignable',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});

describe('getAssignableExtraCurricularsByPhase for a phase', { tags: ['344UC8'] }, () => {
  it('fetches with the phase as the query string', async () => {
    await getAssignableExtraCurricularsByPhase('Junior');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/students/extra-curriculars/assignable?phase=Junior',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
