import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFields, runReport, ReportsError } from '../reports';
import type { ReportDefinitionModel } from '../../models/report';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

const apiFields = {
  filters: [
    {
      key: 'student.name',
      collection: 'Student',
      label: 'Name',
      dataType: 'Text',
      operators: ['equals', 'contains'],
      options: [],
    },
  ],
  columns: [
    {
      key: 'student.name',
      collection: 'Student',
      header: 'Student',
      displayOrder: 1,
      dependsOn: null,
      locked: true,
    },
  ],
};

describe('getFields', () => {
  it('maps the registry', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => apiFields });

    const result = await getFields();

    expect(result.filters[0].key).toBe('student.name');
    expect(result.columns[0].locked).toBe(true);
  });

  it('is never cached — a second call fetches again, so live datasource options stay current', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => apiFields });

    await getFields();
    await getFields();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects with ReportsError on a failed call', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });

    await expect(getFields()).rejects.toThrow(ReportsError);
  });
});

describe('runReport', { tags: ['317UC7'] }, () => {
  it('maps a stubbed response to ordered columns, sections with rows, the count and a ranAt Date', async () => {
    const apiResult = {
      ranAt: '2026-09-21T10:15:00Z',
      studentCount: 2,
      columns: [
        { key: 'student.name', header: 'Student' },
        { key: 'student.class', header: 'Class' },
      ],
      sections: [
        { studentId: 's1', rows: [['Amy van Zyl', '4A2']] },
        { studentId: 's2', rows: [['Ben Smith', 'Private']] },
      ],
    };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => apiResult });

    const definition: ReportDefinitionModel = { filters: [], columns: ['student.name', 'student.class'] };
    const result = await runReport(definition);

    expect(result.ranAt).toBeInstanceOf(Date);
    expect(result.ranAt.toISOString()).toBe('2026-09-21T10:15:00.000Z');
    expect(result.studentCount).toBe(2);
    expect(result.columns).toEqual(apiResult.columns);
    expect(result.sections).toEqual(apiResult.sections);
  });

  it('is never cached — a second call fetches again', async () => {
    const apiResult = { ranAt: '2026-09-21T10:15:00Z', studentCount: 0, columns: [], sections: [] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => apiResult });

    const definition: ReportDefinitionModel = { filters: [], columns: ['student.name'] };
    await runReport(definition);
    await runReport(definition);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('wraps a 400 response in ReportsError carrying the server message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Unknown filter field 'student.unknown'." }),
    });

    const definition: ReportDefinitionModel = { filters: [], columns: ['student.name'] };

    await expect(runReport(definition)).rejects.toThrow("Unknown filter field 'student.unknown'.");
  });

  it('wraps a network failure in ReportsError', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const definition: ReportDefinitionModel = { filters: [], columns: ['student.name'] };

    await expect(runReport(definition)).rejects.toThrow(ReportsError);
  });
});
