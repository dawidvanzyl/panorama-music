import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deactivateUser, deleteUser, AdminError, type GetUserResult } from '../../services/admin';

const mockGetUsers = vi.fn();
vi.mock('../../services/admin', async () => {
  const actual = await vi.importActual<typeof import('../../services/admin')>('../../services/admin');
  return {
    ...actual,
    getUsers: () => mockGetUsers(),
    deactivateUser: vi.fn(),
    deleteUser: vi.fn(),
  };
});

import '../pm-admin-users-page';
import type { PmUsersTable } from '../../components/pm-users-table';
import type { PmDeactivateUserModal } from '../../components/pm-deactivate-user-modal';
import type { PmDeleteUserModal } from '../../components/pm-delete-user-modal';

const users: GetUserResult[] = [
  {
    userId: 'u1',
    email: 'alice@example.com',
    roles: ['Teacher'],
    isActive: true,
    isProtected: false,
    hasCompletedRegistration: true,
  },
  {
    userId: 'u2',
    email: 'bob@example.com',
    roles: ['Teacher'],
    isActive: false,
    isProtected: false,
    hasCompletedRegistration: true,
  },
];

const flush = (): Promise<void> => new Promise<void>(resolve => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-admin-users-page');
  document.body.appendChild(el);
  await flush();
  return el;
}

function deactivateModalOf(el: HTMLElement): PmDeactivateUserModal {
  return el.shadowRoot!.getElementById('deactivateModal') as unknown as PmDeactivateUserModal;
}

function deleteModalOf(el: HTMLElement): PmDeleteUserModal {
  return el.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteUserModal;
}

function confirmDelete(modal: PmDeleteUserModal, email: string): void {
  const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
  input.value = email;
  input.dispatchEvent(new Event('input'));
  modal.shadowRoot!.getElementById('deleteBtn')!.click();
}

function errorBannerOf(el: HTMLElement): HTMLElement {
  return el.shadowRoot!.getElementById('error') as HTMLElement;
}

beforeEach(() => {
  mockGetUsers.mockReset();
  mockGetUsers.mockImplementation(() => Promise.resolve(users.map(u => ({ ...u }))));
  vi.mocked(deactivateUser).mockReset();
  vi.mocked(deactivateUser).mockResolvedValue(undefined);
  vi.mocked(deleteUser).mockReset();
  vi.mocked(deleteUser).mockResolvedValue(undefined);
});

describe('pm-admin-users-page — owns the deactivate API call', { tags: ['161UC2', 'M1.1UC19'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('handling user-deactivate-confirmed calls deactivateUser and refreshes the users list on success', async () => {
    expect(mockGetUsers).toHaveBeenCalledTimes(1);

    const modal = deactivateModalOf(el);
    modal.show('u1', 'alice@example.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();
    await flush();

    expect(vi.mocked(deactivateUser)).toHaveBeenCalledWith('u1');
    expect(mockGetUsers).toHaveBeenCalledTimes(2);
    expect(errorBannerOf(el).classList.contains('admin-users__error--visible')).toBe(false);
  });

  it('ignores a second confirm for the same user while the first deactivate is still in flight', async () => {
    let resolveDeactivate: () => void = () => {};
    vi.mocked(deactivateUser).mockReturnValue(new Promise<void>(resolve => { resolveDeactivate = resolve; }));

    const dispatchConfirm = (): void => {
      el.shadowRoot!.dispatchEvent(
        new CustomEvent('user-deactivate-confirmed', { bubbles: true, composed: true, detail: { userId: 'u1' } }),
      );
    };

    dispatchConfirm();
    dispatchConfirm();
    await flush();

    expect(vi.mocked(deactivateUser)).toHaveBeenCalledTimes(1);

    resolveDeactivate();
    await flush();
  });
});

describe('pm-admin-users-page — surfaces deactivate failures', { tags: ['161UC3'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('displays the AdminError message on the page when deactivateUser rejects', async () => {
    vi.mocked(deactivateUser).mockRejectedValue(new AdminError('User is protected', 400));

    const modal = deactivateModalOf(el);
    modal.show('u1', 'alice@example.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();
    await flush();

    const banner = errorBannerOf(el);
    expect(banner.textContent).toBe('User is protected');
    expect(banner.classList.contains('admin-users__error--visible')).toBe(true);
    expect(modal.hasAttribute('open')).toBe(false);
  });

  it('displays the generic fallback message when deactivateUser rejects with a non-AdminError', async () => {
    vi.mocked(deactivateUser).mockRejectedValue(new Error('boom'));

    const modal = deactivateModalOf(el);
    modal.show('u1', 'alice@example.com');
    modal.shadowRoot!.getElementById('deactivateBtn')!.click();
    await flush();

    expect(errorBannerOf(el).textContent).toBe('An unexpected error occurred');
  });
});

describe('pm-admin-users-page — owns the delete API call', { tags: ['161UC5', 'M1.1UC30'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('handling user-delete-confirmed calls deleteUser and removes the row from pm-users-table on success', async () => {
    const table = el.shadowRoot!.getElementById('usersTable') as unknown as PmUsersTable;
    expect(table.users.map(u => u.userId)).toEqual(['u1', 'u2']);

    const modal = deleteModalOf(el);
    modal.show('u2', 'bob@example.com');
    confirmDelete(modal, 'bob@example.com');
    await flush();

    expect(vi.mocked(deleteUser)).toHaveBeenCalledWith('u2');
    expect(table.users.map(u => u.userId)).toEqual(['u1']);
    expect(errorBannerOf(el).classList.contains('admin-users__error--visible')).toBe(false);
  });

  it('ignores a second confirm for the same user while the first delete is still in flight', async () => {
    let resolveDelete: () => void = () => {};
    vi.mocked(deleteUser).mockReturnValue(new Promise<void>(resolve => { resolveDelete = resolve; }));

    const dispatchConfirm = (): void => {
      el.shadowRoot!.dispatchEvent(
        new CustomEvent('user-delete-confirmed', { bubbles: true, composed: true, detail: { userId: 'u2' } }),
      );
    };

    dispatchConfirm();
    dispatchConfirm();
    await flush();

    expect(vi.mocked(deleteUser)).toHaveBeenCalledTimes(1);

    resolveDelete();
    await flush();
  });
});

describe('pm-admin-users-page — surfaces delete failures', { tags: ['161UC6'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('displays the AdminError message on the page when deleteUser rejects and keeps the row', async () => {
    vi.mocked(deleteUser).mockRejectedValue(new AdminError('User still has active sessions', 409));

    const table = el.shadowRoot!.getElementById('usersTable') as unknown as PmUsersTable;
    const modal = deleteModalOf(el);
    modal.show('u2', 'bob@example.com');
    confirmDelete(modal, 'bob@example.com');
    await flush();

    const banner = errorBannerOf(el);
    expect(banner.textContent).toBe('User still has active sessions');
    expect(banner.classList.contains('admin-users__error--visible')).toBe(true);
    expect(modal.hasAttribute('open')).toBe(false);
    expect(table.users.map(u => u.userId)).toEqual(['u1', 'u2']);
  });

  it('displays the generic fallback message when deleteUser rejects with a non-AdminError', async () => {
    vi.mocked(deleteUser).mockRejectedValue(new Error('boom'));

    const modal = deleteModalOf(el);
    modal.show('u2', 'bob@example.com');
    confirmDelete(modal, 'bob@example.com');
    await flush();

    expect(errorBannerOf(el).textContent).toBe('An unexpected error occurred');
  });
});
