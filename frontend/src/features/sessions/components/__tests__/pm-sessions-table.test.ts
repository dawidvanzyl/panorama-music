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

  it('marks the current session row distinctly and offers no Revoke button on it', () => {
    el.sessions = [currentSession, otherSession];

    const rows = el.shadowRoot!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    const currentRow = [...rows].find((r) => r.classList.contains('sessions-table__row--current'))!;
    expect(currentRow.textContent).toContain('Current Session');
    expect(currentRow.querySelector('button')).toBeNull();

    const otherRow = [...rows].find((r) => !r.classList.contains('sessions-table__row--current'))!;
    expect(otherRow.textContent).not.toContain('Current Session');
    expect(otherRow.querySelector('button')!.disabled).toBe(false);
  });

  it('shows the owning user column when showOwner is enabled, for the admin global view', () => {
    const adminSession: AdminSessionResult = {
      ...currentSession,
      userId: 'u1',
      userEmail: 'admin@test.com',
      userRoles: ['Admin'],
    };
    el.showOwner = true;
    el.sessions = [adminSession];

    const headerCells = el.shadowRoot!.querySelectorAll('thead th');
    expect(headerCells[0].textContent).toBe('User / Account');

    const firstCell = el.shadowRoot!.querySelector('tbody tr td')!;
    expect(firstCell.textContent).toContain('admin@test.com');
  });
});

describe('pm-sessions-table — row Revoke asks for confirmation', { tags: ['395UC6'] }, () => {
  let el: PmSessionsTable;

  beforeEach(() => {
    el = new PmSessionsTable();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function clickRevoke(): { clicked: CustomEvent[]; requested: Event[] } {
    const clicked: CustomEvent[] = [];
    const requested: Event[] = [];
    el.addEventListener('session-revoke-clicked', (e) => clicked.push(e as CustomEvent));
    el.addEventListener('session-revoke-requested', (e) => requested.push(e));
    (el.shadowRoot!.querySelector('tbody button') as HTMLButtonElement).click();
    return { clicked, requested };
  }

  it('emits the clicked event with the token and device, and no revoke request', () => {
    el.sessions = [currentSession, otherSession];

    const { clicked, requested } = clickRevoke();

    expect(clicked).toHaveLength(1);
    expect(clicked[0].detail).toEqual({ tokenId: 'other-session', deviceLabel: 'Firefox on Windows' });
    expect(requested).toHaveLength(0);
  });

  it('names a session without a device label "Unknown device"', () => {
    el.sessions = [{ ...otherSession, deviceLabel: null }];

    const { clicked } = clickRevoke();

    expect(clicked[0].detail.deviceLabel).toBe('Unknown device');
  });
});
