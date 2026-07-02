import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AdminSessionResult } from '../../services/sessions';

const mockGetAllSessions = vi.fn();
vi.mock('../../services/sessions', async () => {
  const actual = await vi.importActual<typeof import('../../services/sessions')>('../../services/sessions');
  return {
    ...actual,
    getAllSessions: () => mockGetAllSessions(),
    revokeSession: vi.fn(),
    revokeAllSessions: vi.fn(),
  };
});

import '../pm-admin-sessions-page';
import '../../components/pm-sessions-table';
import type { PmSessionsTable } from '../../components/pm-sessions-table';

const sessions: AdminSessionResult[] = [
  {
    tokenId: 's1',
    userId: 'u1',
    userEmail: 'alice@example.com',
    userRoles: ['Admin'],
    sessionStartedAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-08T00:00:00Z',
    deviceLabel: 'Chrome',
    ipAddress: '1.2.3.4',
    isCurrent: true,
  },
  {
    tokenId: 's2',
    userId: 'u2',
    userEmail: 'bob@example.com',
    userRoles: [],
    sessionStartedAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-08T00:00:00Z',
    deviceLabel: 'Firefox',
    ipAddress: '1.2.3.5',
    isCurrent: false,
  },
];

describe('pm-admin-sessions-page — filter control', { tags: ['M1.4UC8'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    mockGetAllSessions.mockReset();
    mockGetAllSessions.mockResolvedValue(sessions);
    el = document.createElement('pm-admin-sessions-page');
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders a filter input above the sessions table', () => {
    const filterInput = el.shadowRoot!.getElementById('filterInput') as HTMLInputElement;
    expect(filterInput).not.toBeNull();
    expect(filterInput.type).toBe('search');
  });

  it('filters the visible sessions by user email as the admin types', () => {
    const filterInput = el.shadowRoot!.getElementById('filterInput') as HTMLInputElement;
    const table = el.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;

    expect(table.sessions.length).toBe(2);

    filterInput.value = 'alice';
    filterInput.dispatchEvent(new Event('input'));

    expect(table.sessions.length).toBe(1);
    expect(table.sessions[0].tokenId).toBe('s1');
  });

  it('shows every session again once the filter is cleared', () => {
    const filterInput = el.shadowRoot!.getElementById('filterInput') as HTMLInputElement;
    const table = el.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;

    filterInput.value = 'bob';
    filterInput.dispatchEvent(new Event('input'));
    expect(table.sessions.length).toBe(1);

    filterInput.value = '';
    filterInput.dispatchEvent(new Event('input'));
    expect(table.sessions.length).toBe(2);
  });
});
