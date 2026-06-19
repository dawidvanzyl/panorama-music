import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmUsersTable } from '../pm-users-table';
import { PmDeleteUserModal } from '../pm-delete-user-modal';
import { deleteUser } from '../../services/admin';
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

const deactivatedUser: GetUserResult = {
  userId: 'user-deactivated',
  email: 'teacher@test.com',
  roles: ['Teacher'],
  isActive: false,
  isProtected: false,
  hasCompletedRegistration: true,
};

describe('pm-users-table — delete button for deactivated users', { tags: ['M1.1UC27'] }, () => {
  let table: PmUsersTable;

  beforeEach(() => {
    table = new PmUsersTable();
    document.body.appendChild(table);
  });

  afterEach(() => {
    document.body.removeChild(table);
  });

  it('deactivated user row renders a Delete button', () => {
    table.users = [deactivatedUser];
    const deleteBtn = table.shadowRoot!.querySelector('.users-table__btn--delete');
    expect(deleteBtn).not.toBeNull();
    expect(deleteBtn!.textContent).toBe('Delete');
  });

  it('clicking Delete dispatches user-delete-requested event with userId and email', () => {
    table.users = [deactivatedUser];
    const events: CustomEvent[] = [];
    table.addEventListener('user-delete-requested', (e) => events.push(e as CustomEvent));

    table.shadowRoot!.querySelector<HTMLButtonElement>('.users-table__btn--delete')!.click();

    expect(events).toHaveLength(1);
    expect(events[0].detail.userId).toBe(deactivatedUser.userId);
    expect(events[0].detail.email).toBe(deactivatedUser.email);
  });
});

describe('pm-delete-user-modal — confirmation dialog', { tags: ['M1.1UC28'] }, () => {
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

  it('Delete button is disabled when modal opens', () => {
    modal.show('user-id-1', 'teacher@test.com');
    const deleteBtn = modal.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);
  });

  it('Delete button remains disabled when wrong email is typed', () => {
    modal.show('user-id-1', 'teacher@test.com');
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'wrong@test.com';
    input.dispatchEvent(new Event('input'));
    const deleteBtn = modal.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);
  });
});

describe('pm-delete-user-modal — email confirmation enables delete', { tags: ['M1.1UC29'] }, () => {
  let modal: PmDeleteUserModal;

  beforeEach(() => {
    modal = new PmDeleteUserModal();
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.removeChild(modal);
  });

  it('Delete button becomes enabled when correct email is typed', () => {
    modal.show('user-id-1', 'teacher@test.com');
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'teacher@test.com';
    input.dispatchEvent(new Event('input'));
    const deleteBtn = modal.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(false);
  });
});

describe('pm-delete-user-modal — delete confirmation', { tags: ['M1.1UC30'] }, () => {
  let modal: PmDeleteUserModal;

  beforeEach(() => {
    modal = new PmDeleteUserModal();
    document.body.appendChild(modal);
    vi.mocked(deleteUser).mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.removeChild(modal);
    vi.clearAllMocks();
  });

  it('clicking Delete calls deleteUser, closes modal, and emits user-deleted event', async () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('user-deleted', (e) => events.push(e as CustomEvent));

    modal.show('user-id-1', 'teacher@test.com');
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'teacher@test.com';
    input.dispatchEvent(new Event('input'));
    modal.shadowRoot!.getElementById('deleteBtn')!.click();

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(vi.mocked(deleteUser)).toHaveBeenCalledWith('user-id-1');
    expect(modal.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0].detail.userId).toBe('user-id-1');
  });
});

describe('pm-delete-user-modal — cancel', { tags: ['M1.1UC31'] }, () => {
  let modal: PmDeleteUserModal;

  beforeEach(() => {
    modal = new PmDeleteUserModal();
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.removeChild(modal);
  });

  it('Cancel button closes the modal without making an API call', () => {
    modal.show('user-id-1', 'teacher@test.com');
    modal.shadowRoot!.getElementById('cancelBtn')!.dispatchEvent(new Event('click'));
    expect(modal.hasAttribute('open')).toBe(false);
    expect(vi.mocked(deleteUser)).not.toHaveBeenCalled();
  });
});