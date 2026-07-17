import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditEventPage } from '../../services/audit';

const mockGetAuditEvents = vi.fn();
vi.mock('../../services/audit', async () => {
  const actual = await vi.importActual<typeof import('../../services/audit')>('../../services/audit');
  return {
    ...actual,
    getAuditEvents: (filters: unknown) => mockGetAuditEvents(filters),
  };
});

import '../pm-admin-activity-log-page';
import '../../components/pm-audit-filter-bar';
import '../../components/pm-audit-event-table';
import type { PmAuditFilterBar } from '../../components/pm-audit-filter-bar';
import type { PmAuditEventTable } from '../../components/pm-audit-event-table';

const samplePage: AuditEventPage = {
  items: [
    {
      occurredAt: '2026-01-01T10:00:00Z',
      eventType: 'identity.user.login_succeeded',
      actorEmail: 'admin@test.com',
      targetDisplay: null,
      outcome: 'success',
      reason: null,
      sourceIp: '127.0.0.1',
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 25,
};

describe('pm-admin-activity-log-page — initial load', { tags: ['M1.5UC15'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    mockGetAuditEvents.mockReset();
    mockGetAuditEvents.mockResolvedValue(samplePage);
    el = document.createElement('pm-admin-activity-log-page');
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('loads audit events on connect and renders them in the table', () => {
    expect(mockGetAuditEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 25 }));

    const table = el.shadowRoot!.getElementById('eventTable') as unknown as PmAuditEventTable;
    const rows = table.shadowRoot!.querySelectorAll('#rows tr');
    expect(rows.length).toBe(1);
  });

  it('shows the empty state when no events match', async () => {
    mockGetAuditEvents.mockReset();
    mockGetAuditEvents.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 25 });

    const freshEl = document.createElement('pm-admin-activity-log-page');
    document.body.appendChild(freshEl);
    await Promise.resolve();
    await Promise.resolve();

    const table = freshEl.shadowRoot!.getElementById('eventTable') as unknown as PmAuditEventTable;
    const empty = table.shadowRoot!.getElementById('empty') as HTMLElement;
    expect(empty.hidden).toBe(false);

    document.body.removeChild(freshEl);
  });
});

describe('pm-admin-activity-log-page — applying filters', { tags: ['M1.5UC16'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    mockGetAuditEvents.mockReset();
    mockGetAuditEvents.mockResolvedValue(samplePage);
    el = document.createElement('pm-admin-activity-log-page');
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('resets pagination to page 1 and reloads with the new filter values on apply', async () => {
    const table = el.shadowRoot!.getElementById('eventTable') as unknown as PmAuditEventTable;
    table.dispatchEvent(new CustomEvent('audit-page-changed', { bubbles: true, composed: true, detail: { page: 3 } }));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGetAuditEvents).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));

    const filterBar = el.shadowRoot!.getElementById('filterBar') as unknown as PmAuditFilterBar;
    filterBar.dispatchEvent(
      new CustomEvent('audit-filter-changed', {
        bubbles: true,
        composed: true,
        detail: { actor: 'teacher@test.com', eventType: '', from: '', to: '' },
      }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetAuditEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ actor: 'teacher@test.com', page: 1 }),
    );
  });
});
