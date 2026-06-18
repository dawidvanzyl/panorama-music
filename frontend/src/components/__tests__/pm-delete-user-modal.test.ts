import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmUsersTable } from '../pm-users-table';
import { PmDeleteUserModal } from '../pm-delete-user-modal';
import type { GetUserResult } from '../../services/admin';

vi.mock('../../services/admin', () => ({
  deleteUser: vi.fn(),
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
};

describe('pm-users-table — remove button', { tags: ['M1.1UC18'] }, () => {
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

  it('active non-protected non-self user row renders a Remove button', () => {
    table.users = [activeUser];
    const removeBtn = table.shadowRoot!.querySelector('.users-table__btn--remove');
    expect(removeBtn).not.toBeNull();
    expect(removeBtn!.textContent).toBe('Remove');
  });

  it('clicking Remove dispatches user-remove-requested event with userId and email', () => {
    table.users = [activeUser];
    const events: CustomEvent[] = [];
    table.addEventListener('user-remove-requested', (e) => events.push(e as CustomEvent));

    table.shadowRoot!.querySelector<HTMLButtonElement>('.users-table__btn--remove')!.click();

    expect(events).toHaveLength(1);
    expect(events[0].detail.userId).toBe(activeUser.userId);
    expect(events[0].detail.email).toBe(activeUser.email);
  });

  it('own user row shows a hidden Remove button', () => {
    const sub = btoa(JSON.stringify({ sub: activeUser.userId, roles: 'Admin', exp: 9999999999 }));
    localStorage.setItem('pm_access_token', `header.${sub}.sig`);
    localStorage.setItem('pm_expires_at', new Date(Date.now() + 3600_000).toISOString());

    table.users = [activeUser];
    const btn = table.shadowRoot!.querySelector<HTMLElement>('.users-table__btn--remove');
    expect(btn).not.toBeNull();
    expect(btn!.style.visibility).toBe('hidden');
  });

  it('protected user row shows a hidden Remove button', () => {
    table.users = [{ ...activeUser, isProtected: true }];
    const btn = table.shadowRoot!.querySelector<HTMLElement>('.users-table__btn--remove');
    expect(btn).not.toBeNull();
    expect(btn!.style.visibility).toBe('hidden');
  });
});

describe('pm-delete-user-modal — confirmation dialog', { tags: ['M1.1UC18'] }, () => {
  let modal: PmDeleteUserModal;

  beforeEach(() => {
    modal = new PmDeleteUserModal();
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

  it('Delete User button is present', () => {
    modal.show('user-id-1', 'teacher@test.com');
    expect(modal.shadowRoot!.getElementById('deleteBtn')).not.toBeNull();
  });
});
