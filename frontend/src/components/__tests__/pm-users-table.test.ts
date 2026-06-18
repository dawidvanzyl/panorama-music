import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmUsersTable } from '../pm-users-table';
import type { GetUserResult } from '../../services/admin';

const activeUser: GetUserResult = {
  userId: 'user-active',
  email: 'teacher@test.com',
  roles: ['Teacher'],
  isActive: true,
  isProtected: false,
};

describe('pm-users-table — inline role edit', { tags: ['M1.1UC14'] }, () => {
  let el: PmUsersTable;

  beforeEach(() => {
    el = new PmUsersTable();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
    localStorage.removeItem('pm_access_token');
    localStorage.removeItem('pm_expires_at');
  });

  it('active user row renders an Edit button in display mode', () => {
    el.users = [activeUser];
    const editBtn = el.shadowRoot!.querySelector('.users-table__btn--edit');
    expect(editBtn).not.toBeNull();
    expect(editBtn!.textContent).toBe('Edit');
  });

  it('clicking Edit replaces role badges with checkboxes pre-checked to current roles', () => {
    el.users = [activeUser];
    el.shadowRoot!.querySelector<HTMLButtonElement>('.users-table__btn--edit')!.click();

    const checkboxes = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);

    const teacherBox = [...checkboxes].find(cb => cb.value === 'Teacher')!;
    const adminBox = [...checkboxes].find(cb => cb.value === 'Admin')!;
    expect(teacherBox.checked).toBe(true);
    expect(adminBox.checked).toBe(false);
  });

  it('edit mode shows Save and Cancel buttons', () => {
    el.users = [activeUser];
    el.shadowRoot!.querySelector<HTMLButtonElement>('.users-table__btn--edit')!.click();

    expect(el.shadowRoot!.querySelector('.users-table__btn--save')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.users-table__btn--cancel')).not.toBeNull();
  });

  it('pending user row shows Regenerate Invite instead of Edit', () => {
    el.users = [{ ...activeUser, userId: 'user-pending', isActive: false }];
    expect(el.shadowRoot!.querySelector('.users-table__btn--edit')).toBeNull();
    expect(el.shadowRoot!.querySelector('.users-table__regenerate')).not.toBeNull();
  });

  it('only one row can be in edit mode at a time', () => {
    const second: GetUserResult = { ...activeUser, userId: 'user-2', email: 'other@test.com' };
    el.users = [activeUser, second];

    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.users-table__btn--edit')[0].click();

    expect(el.shadowRoot!.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);
    expect(el.shadowRoot!.querySelectorAll('.users-table__btn--edit').length).toBe(1);
  });

  it('Cancel restores display mode without a network call', () => {
    el.users = [activeUser];
    el.shadowRoot!.querySelector<HTMLButtonElement>('.users-table__btn--edit')!.click();
    el.shadowRoot!.querySelector<HTMLButtonElement>('.users-table__btn--cancel')!.click();

    expect(el.shadowRoot!.querySelector('input[type="checkbox"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('.users-table__btn--edit')).not.toBeNull();
  });

  it('protected user row shows no Edit button', () => {
    el.users = [{ ...activeUser, isProtected: true }];
    expect(el.shadowRoot!.querySelector('.users-table__btn--edit')).toBeNull();
    expect(el.shadowRoot!.querySelector('.users-table__regenerate')).toBeNull();
  });

  it('own user row shows no Edit button', () => {
    const sub = btoa(JSON.stringify({ sub: activeUser.userId, roles: 'Admin', exp: 9999999999 }));
    localStorage.setItem('pm_access_token', `header.${sub}.sig`);
    localStorage.setItem('pm_expires_at', new Date(Date.now() + 3600_000).toISOString());

    el.users = [activeUser];
    expect(el.shadowRoot!.querySelector('.users-table__btn--edit')).toBeNull();
  });
});
