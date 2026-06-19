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
    vi.mocked(deactivateUser).mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.removeChild(modal);
    vi.clearAllMocks();
  });

  it('clicking Deactivate calls deactivateUser, closes modal, and emits user-deactivated event', async () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('user-deactivated', (e) => events.push(e as CustomEvent));

    modal.show('user-id-1', 'teacher@test.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(vi.mocked(deactivateUser)).toHaveBeenCalledWith('user-id-1');
    expect(modal.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0].detail.userId).toBe('user-id-1');
  });

  it('buttons are re-enabled when show() is called after a previous successful deactivation', async () => {
    modal.show('user-id-1', 'teacher@test.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    modal.show('user-id-2', 'other@test.com');

    const cancelBtn = modal.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    const deactivateBtn = modal.shadowRoot!.getElementById('deactivateBtn') as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(false);
    expect(deactivateBtn.disabled).toBe(false);
  });
});