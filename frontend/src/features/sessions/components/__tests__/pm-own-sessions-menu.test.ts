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

import '../pm-own-sessions-menu';
import type { PmOwnSessionsMenu } from '../pm-own-sessions-menu';
import type { PmOwnSessionsModal } from '../pm-own-sessions-modal';
import type { PmSessionsTable } from '../pm-sessions-table';

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

/** Lets a pending promise chain settle before assertions run. */
function flush(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function createMenu(): PmOwnSessionsMenu {
  const el = document.createElement('pm-own-sessions-menu') as PmOwnSessionsMenu;
  document.body.appendChild(el);
  return el;
}

function openBtnOf(el: PmOwnSessionsMenu): HTMLButtonElement {
  return el.shadowRoot!.getElementById('openBtn') as HTMLButtonElement;
}

function modalOf(el: PmOwnSessionsMenu): PmOwnSessionsModal {
  return el.dialogHost.querySelector('#modal') as unknown as PmOwnSessionsModal;
}

function tableOf(modal: PmOwnSessionsModal): PmSessionsTable {
  return modal.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;
}

function errorOf(modal: PmOwnSessionsModal): HTMLElement {
  return modal.shadowRoot!.getElementById('error') as HTMLElement;
}

describe('account chip — Active Sessions is offered to every signed-in user', { tags: ['247UC1'] }, () => {
  let el: PmOwnSessionsMenu;

  beforeEach(() => {
    mockGetOwnSessions.mockReset();
    mockGetOwnSessions.mockResolvedValue(sessions);
    el = createMenu();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('offers the item without asking the server anything first', () => {
    // Unlike My Details, there is nothing to gate on — every signed-in user has
    // sessions, so the item is never hidden and costs no request per page load.
    expect(el.hidden).toBe(false);
    expect(openBtnOf(el).textContent).toContain('Active Sessions');
    expect(mockGetOwnSessions).not.toHaveBeenCalled();
  });

  it('presents the item as a menu item so it reads as one inside the dropdown', () => {
    expect(openBtnOf(el).getAttribute('role')).toBe('menuitem');
  });
});

describe('account chip — Active Sessions opens a dialog mounted on the document', { tags: ['247UC2'] }, () => {
  let el: PmOwnSessionsMenu;

  beforeEach(() => {
    mockGetOwnSessions.mockReset();
    mockGetOwnSessions.mockResolvedValue(sessions);
    el = createMenu();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('mounts the dialog on the document rather than inside the menu item', () => {
    // The dropdown closes on the very click that opens the dialog, so a dialog
    // nested inside it would be hidden along with it.
    expect(el.dialogHost.parentElement).toBe(document.body);
    expect(el.contains(el.dialogHost)).toBe(false);
    expect(el.shadowRoot!.querySelector('pm-own-sessions-modal')).toBeNull();
  });

  it('leaves the dialog open once the menu item that opened it is gone', async () => {
    openBtnOf(el).click();
    await flush();

    const modal = modalOf(el);
    expect(modal.hasAttribute('open')).toBe(true);

    // Stand-in for the dropdown closing: the item is hidden, the dialog is not.
    el.hidden = true;
    expect(modal.hasAttribute('open')).toBe(true);
    expect(modal.isConnected).toBe(true);
  });

  it('removes the mounted dialog when the menu item leaves the page', () => {
    const host = el.dialogHost;
    document.body.removeChild(el);

    expect(host.isConnected).toBe(false);

    document.body.appendChild(el);
  });
});

describe('own sessions dialog — the list, and revoking from it', { tags: ['M1.4UC11'] }, () => {
  let el: PmOwnSessionsMenu;
  let modal: PmOwnSessionsModal;

  beforeEach(async () => {
    mockGetOwnSessions.mockReset();
    mockRevokeOwnSession.mockReset();
    mockRevokeOwnOtherSessions.mockReset();
    mockGetOwnSessions.mockResolvedValue(sessions);

    el = createMenu();
    modal = modalOf(el);
    openBtnOf(el).click();
    await flush();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it("loads and renders the current user's own sessions", () => {
    expect(tableOf(modal).sessions).toEqual(sessions);
  });

  it('shows an error banner when the list cannot be loaded', async () => {
    mockGetOwnSessions.mockRejectedValue(new SessionError('Unable to load sessions', 500));

    openBtnOf(el).click();
    await flush();

    expect(errorOf(modal).textContent).toBe('Unable to load sessions');
    expect(errorOf(modal).classList.contains('own-sessions__error--visible')).toBe(true);
  });

  it('revoking a single session removes it from the table', async () => {
    mockRevokeOwnSession.mockResolvedValue(undefined);

    tableOf(modal).dispatchEvent(
      new CustomEvent('session-revoke-requested', {
        detail: { tokenId: 'other' },
        bubbles: true,
        composed: true,
      }),
    );
    await flush();

    expect(mockRevokeOwnSession).toHaveBeenCalledWith('other');
    expect(tableOf(modal).sessions.some((s) => s.tokenId === 'other')).toBe(false);
  });

  it('shows an error banner when revoking a session fails', async () => {
    mockRevokeOwnSession.mockRejectedValue(new SessionError('Cannot revoke current session', 400));

    tableOf(modal).dispatchEvent(
      new CustomEvent('session-revoke-requested', {
        detail: { tokenId: 'current' },
        bubbles: true,
        composed: true,
      }),
    );
    await flush();

    expect(errorOf(modal).textContent).toBe('Cannot revoke current session');
    expect(errorOf(modal).classList.contains('own-sessions__error--visible')).toBe(true);
  });

  it('clicking "Revoke all other sessions" revokes others and reloads the list', async () => {
    mockRevokeOwnOtherSessions.mockResolvedValue(undefined);
    mockGetOwnSessions.mockResolvedValue([sessions[0]]);

    (modal.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement).click();
    await flush();

    expect(mockRevokeOwnOtherSessions).toHaveBeenCalledTimes(1);
    expect(tableOf(modal).sessions).toEqual([sessions[0]]);
  });

  it('shows an error banner when revoking all other sessions fails', async () => {
    mockRevokeOwnOtherSessions.mockRejectedValue(new SessionError('Something went wrong', 500));

    const revokeAllBtn = modal.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    revokeAllBtn.click();
    await flush();

    expect(errorOf(modal).textContent).toBe('Something went wrong');
    expect(errorOf(modal).classList.contains('own-sessions__error--visible')).toBe(true);
    expect(revokeAllBtn.disabled).toBe(false);
  });

  it('opens from an empty list rather than showing the previous fetch’s rows', async () => {
    expect(tableOf(modal).sessions).toEqual(sessions);

    // The dialog outlives its openings, so anything left over would present
    // sessions that may already have been revoked as though they were current.
    let respond: ((value: SessionResult[]) => void) | undefined;
    mockGetOwnSessions.mockReturnValue(
      new Promise<SessionResult[]>((resolve) => {
        respond = resolve;
      }),
    );

    openBtnOf(el).click();

    expect(tableOf(modal).sessions).toEqual([]);

    respond!([sessions[0]]);
    await flush();

    expect(tableOf(modal).sessions).toEqual([sessions[0]]);
  });

  it('closes on the dialog’s own close control, leaving the page behind untouched', () => {
    (modal.shadowRoot!.getElementById('closeBtn') as HTMLButtonElement).click();

    expect(modal.hasAttribute('open')).toBe(false);
    expect(window.location.hash).not.toContain('sessions');
  });
});
