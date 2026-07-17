import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SessionResult } from '../../services/sessions';
import { SessionError } from '../../services/sessions';

const mockGetOwnSessions = vi.fn();
const mockRevokeOwnSession = vi.fn();
const mockRevokeOwnOtherSessions = vi.fn();
vi.mock('../../services/sessions', async () => {
  const actual = await vi.importActual<typeof import('../../services/sessions')>('../../services/sessions');
  return {
    ...actual,
    getOwnSessions: () => mockGetOwnSessions(),
    revokeOwnSession: (tokenId: string) => mockRevokeOwnSession(tokenId),
    revokeOwnOtherSessions: () => mockRevokeOwnOtherSessions(),
  };
});

import '../pm-sessions-page';
import '../../components/pm-sessions-table';
import type { PmSessionsTable } from '../../components/pm-sessions-table';

const sessions: SessionResult[] = [
  {
    tokenId: 'current',
    sessionStartedAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-08T00:00:00Z',
    deviceLabel: 'Chrome',
    ipAddress: '1.2.3.4',
    isCurrent: true,
  },
  {
    tokenId: 'other',
    sessionStartedAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-08T00:00:00Z',
    deviceLabel: 'Firefox',
    ipAddress: '1.2.3.5',
    isCurrent: false,
  },
];

describe('pm-sessions-page', { tags: ['M1.4UC11'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    mockGetOwnSessions.mockReset();
    mockRevokeOwnSession.mockReset();
    mockRevokeOwnOtherSessions.mockReset();
    mockGetOwnSessions.mockResolvedValue(sessions);
    el = document.createElement('pm-sessions-page');
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it("loads and renders the current user's own sessions", () => {
    const table = el.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;
    expect(table.sessions).toEqual(sessions);
  });

  it('revoking a single session removes it from the table', async () => {
    mockRevokeOwnSession.mockResolvedValue(undefined);
    const table = el.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;

    table.dispatchEvent(
      new CustomEvent('session-revoke-requested', {
        detail: { tokenId: 'other' },
        bubbles: true,
      }),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockRevokeOwnSession).toHaveBeenCalledWith('other');
    expect(table.sessions.some((s) => s.tokenId === 'other')).toBe(false);
  });

  it('shows an error banner when revoking a session fails', async () => {
    mockRevokeOwnSession.mockRejectedValue(new SessionError('Cannot revoke current session', 400));
    const table = el.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;

    table.dispatchEvent(
      new CustomEvent('session-revoke-requested', {
        detail: { tokenId: 'current' },
        bubbles: true,
      }),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const errorBanner = el.shadowRoot!.getElementById('error') as HTMLElement;
    expect(errorBanner.textContent).toBe('Cannot revoke current session');
    expect(errorBanner.classList.contains('sessions-page__error--visible')).toBe(true);
  });

  it('clicking "Revoke all other sessions" revokes others and reloads the list', async () => {
    mockRevokeOwnOtherSessions.mockResolvedValue(undefined);
    mockGetOwnSessions.mockResolvedValue([sessions[0]]);

    const revokeAllBtn = el.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    revokeAllBtn.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockRevokeOwnOtherSessions).toHaveBeenCalledTimes(1);
    const table = el.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;
    expect(table.sessions).toEqual([sessions[0]]);
  });

  it('shows an error banner when revoking all other sessions fails', async () => {
    mockRevokeOwnOtherSessions.mockRejectedValue(new SessionError('Something went wrong', 500));

    const revokeAllBtn = el.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    revokeAllBtn.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const errorBanner = el.shadowRoot!.getElementById('error') as HTMLElement;
    expect(errorBanner.textContent).toBe('Something went wrong');
    expect(errorBanner.classList.contains('sessions-page__error--visible')).toBe(true);
    expect(revokeAllBtn.disabled).toBe(false);
  });
});
