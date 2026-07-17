import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmUsersTable } from '../pm-users-table';
import { PmDeactivateUserModal } from '../pm-deactivate-user-modal';
import { deactivateUser } from '../../services/admin';
import type { GetUserResult } from '../../services/admin';

vi.mock('../../services/admin', () => ({
  deactivateUser: vi.fn(),
  AdminError: class AdminError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'AdminError';
      this.status = status;
    }
  },
}));

const activeUser: GetUserResult = {
  userId: 'user-active',
  email: 'teacher@test.com',
  roles: ['Teacher'],
  isActive: true,
  isProtected: false,
  hasCompletedRegistration: true,
};

describe('pm-users-table — deactivate button', { tags: ['M1.1UC18'] }, () => {
  let table: PmUsersTable;

  beforeEach(() => {
    table = new PmUsersTable();
    document.body.appendChild(table);
  });

  afterEach(() => {
    document.body.removeChild(table);
    localStorage.removeItem('pm_access_token');
    localStorage.removeItem('pm_expires_at');
  });

  it('active non-protected non-self user row renders a Deactivate button', () => {
    table.users = [activeUser];
    const deactivateBtn = table.shadowRoot!.querySelector('.users-table__btn--deactivate');
    expect(deactivateBtn).not.toBeNull();
    expect(deactivateBtn!.textContent).toBe('Deactivate');
  });

  it('clicking Deactivate dispatches user-deactivate-requested event with userId and email', () => {
    table.users = [activeUser];
    const events: CustomEvent[] = [];
    table.addEventListener('user-deactivate-requested', (e) => events.push(e as CustomEvent));

    table.shadowRoot!.querySelector<HTMLButtonElement>('.users-table__btn--deactivate')!.click();

    expect(events).toHaveLength(1);
    expect(events[0].detail.userId).toBe(activeUser.userId);
    expect(events[0].detail.email).toBe(activeUser.email);
  });

  it('own user row shows a hidden Deactivate button', () => {
    const sub = btoa(JSON.stringify({ sub: activeUser.userId, roles: 'Admin', exp: 9999999999 }));
    localStorage.setItem('pm_access_token', `header.${sub}.sig`);
    localStorage.setItem('pm_expires_at', new Date(Date.now() + 3600_000).toISOString());

    table.users = [activeUser];
    const btn = table.shadowRoot!.querySelector<HTMLElement>('.users-table__btn--deactivate');
    expect(btn).not.toBeNull();
    expect(btn!.style.visibility).toBe('hidden');
  });

  it('protected user row shows a hidden Deactivate button', () => {
    table.users = [{ ...activeUser, isProtected: true }];
    const btn = table.shadowRoot!.querySelector<HTMLElement>('.users-table__btn--deactivate');
    expect(btn).not.toBeNull();
    expect(btn!.style.visibility).toBe('hidden');
  });

  it('inactive user row shows no Deactivate button', () => {
    table.users = [{ ...activeUser, isActive: false }];
    expect(table.shadowRoot!.querySelector('.users-table__btn--deactivate')).toBeNull();
  });
});

describe('pm-deactivate-user-modal — confirmation dialog', { tags: ['M1.1UC18'] }, () => {
  let modal: PmDeactivateUserModal;

  beforeEach(() => {
    modal = new PmDeactivateUserModal();
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.removeChild(modal);
  });

  it('is hidden by default', () => {
    expect(modal.hasAttribute('open')).toBe(false);
  });

  it('show() makes the modal visible and displays the target email', () => {
    modal.show('user-id-1', 'teacher@test.com');
    expect(modal.hasAttribute('open')).toBe(true);
    const emailEl = modal.shadowRoot!.getElementById('modalEmail');
    expect(emailEl!.textContent).toBe('teacher@test.com');
  });

  it('Cancel button closes the modal without making an API call', () => {
    modal.show('user-id-1', 'teacher@test.com');
    modal.shadowRoot!.getElementById('cancelBtn')!.dispatchEvent(new Event('click'));
    expect(modal.hasAttribute('open')).toBe(false);
    expect(vi.mocked(deactivateUser)).not.toHaveBeenCalled();
  });

  it('Deactivate button is present', () => {
    modal.show('user-id-1', 'teacher@test.com');
    expect(modal.shadowRoot!.getElementById('deactivateBtn')).not.toBeNull();
  });
});

describe('pm-deactivate-user-modal — deactivate confirmation', { tags: ['M1.1UC19'] }, () => {
  let modal: PmDeactivateUserModal;

  beforeEach(() => {
    modal = new PmDeactivateUserModal();
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.removeChild(modal);
    vi.clearAllMocks();
  });

  it('clicking Deactivate closes the modal and emits user-deactivate-confirmed for the page to act on', () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('user-deactivate-confirmed', (e) => events.push(e as CustomEvent));

    modal.show('user-id-1', 'teacher@test.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();

    expect(modal.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0].detail.userId).toBe('user-id-1');
  });

  it('re-opening for a different user emits that user id on the next confirmation', () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('user-deactivate-confirmed', (e) => events.push(e as CustomEvent));

    modal.show('user-id-1', 'teacher@test.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();

    modal.show('user-id-2', 'other@test.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();

    expect(events).toHaveLength(2);
    expect(events[1].detail.userId).toBe('user-id-2');
  });
});

describe('pm-deactivate-user-modal — dispatches instead of calling the API', { tags: ['161UC1'] }, () => {
  let modal: PmDeactivateUserModal;

  beforeEach(() => {
    modal = new PmDeactivateUserModal();
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.removeChild(modal);
    vi.clearAllMocks();
  });

  it('clicking Deactivate dispatches user-deactivate-confirmed with the userId and does not call deactivateUser itself', () => {
    const events: CustomEvent<{ userId: string }>[] = [];
    modal.addEventListener('user-deactivate-confirmed', (e) => events.push(e as CustomEvent<{ userId: string }>));

    modal.show('user-id-1', 'teacher@test.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ userId: 'user-id-1' });
    expect(vi.mocked(deactivateUser)).not.toHaveBeenCalled();
  });

  it('dispatches a bubbling, composed event so the owning page can listen at its shadow root', () => {
    modal.show('user-id-1', 'teacher@test.com');

    const events: CustomEvent[] = [];
    document.body.addEventListener('user-deactivate-confirmed', (e) => events.push(e as CustomEvent), { once: true });
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();

    expect(events).toHaveLength(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });
});