import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAuditEvents, AuditError, type AuditEventPage } from '../audit';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('getAuditEvents', { tags: ['M1.5UC15'] }, () => {
  it('requests default page 1 / page size 25 when no filters are supplied', async () => {
    const page: AuditEventPage = { items: [], totalCount: 0, page: 1, pageSize: 25 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => page,
    });

    const result = await getAuditEvents();

    expect(result).toEqual(page);
    expect(mockFetch).toHaveBeenCalledWith('/api/audit?page=1&pageSize=25', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('throws AuditError on a failed request', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    await expect(getAuditEvents()).rejects.toThrow('Forbidden');
    await expect(getAuditEvents()).rejects.toBeInstanceOf(AuditError);
  });
});

describe('getAuditEvents — filter query params', { tags: ['M1.5UC16'] }, () => {
  it('includes only the filters that were supplied, omitting empty ones', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], totalCount: 0, page: 1, pageSize: 25 }),
    });

    await getAuditEvents({ actor: 'teacher@test.com', eventType: 'identity.user.login_succeeded', page: 2, pageSize: 10 });

    const requestedUrl = mockFetch.mock.calls[0][0] as string;
    const params = new URL(requestedUrl, 'http://localhost').searchParams;

    expect(params.get('actor')).toBe('teacher@test.com');
    expect(params.get('eventType')).toBe('identity.user.login_succeeded');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('10');
    expect(params.has('from')).toBe(false);
    expect(params.has('to')).toBe(false);
  });
});
