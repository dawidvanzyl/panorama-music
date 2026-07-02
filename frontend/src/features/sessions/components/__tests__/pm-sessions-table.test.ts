import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmSessionsTable } from '../pm-sessions-table';
import type { SessionResult, AdminSessionResult } from '../../services/sessions';

const currentSession: SessionResult = {
  tokenId: 'current-session',
  sessionStartedAt: '2024-01-01T00:00:00Z',
  lastSeenAt: '2024-01-02T00:00:00Z',
  expiresAt: '2024-01-08T00:00:00Z',
  deviceLabel: 'Chrome on macOS',
  ipAddress: '192.168.1.1',
  isCurrent: true,
};

const otherSession: SessionResult = {
  tokenId: 'other-session',
  sessionStartedAt: '2024-01-01T00:00:00Z',
  lastSeenAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-01-08T00:00:00Z',
  deviceLabel: 'Firefox on Windows',
  ipAddress: '192.168.1.2',
  isCurrent: false,
};

describe('pm-sessions-table — current session distinguishability', { tags: ['M1.4UC11'] }, () => {
  let el: PmSessionsTable;

  beforeEach(() => {
    el = new PmSessionsTable();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('marks the current session row distinctly and disables its Revoke button', () => {
    el.sessions = [currentSession, otherSession];

    const rows = el.shadowRoot!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    const currentRow = [...rows].find(r => r.classList.contains('sessions-table__row--current'))!;
    expect(currentRow.textContent).toContain('Current Session');
    expect(currentRow.querySelector('button')!.disabled).toBe(true);

    const otherRow = [...rows].find(r => !r.classList.contains('sessions-table__row--current'))!;
    expect(otherRow.textContent).not.toContain('Current Session');
    expect(otherRow.querySelector('button')!.disabled).toBe(false);
  });

  it('shows the owning user column when showOwner is enabled, for the admin global view', () => {
    const adminSession: AdminSessionResult = { ...currentSession, userId: 'u1', userEmail: 'admin@test.com', userRoles: ['Admin'] };
    el.showOwner = true;
    el.sessions = [adminSession];

    const headerCells = el.shadowRoot!.querySelectorAll('thead th');
    expect(headerCells[0].textContent).toBe('User / Account');

    const firstCell = el.shadowRoot!.querySelector('tbody tr td')!;
    expect(firstCell.textContent).toContain('admin@test.com');
  });
});
