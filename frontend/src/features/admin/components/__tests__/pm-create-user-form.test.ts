import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmCreateUserForm } from '../pm-create-user-form';
import { ALL_ROLES } from '../../services/admin';

const mockCreateUser = vi.fn();
vi.mock('../../services/admin', async () => {
  const actual = await vi.importActual<typeof import('../../services/admin')>('../../services/admin');
  return {
    ...actual,
    createUser: (email: string, roles: string[]) => mockCreateUser(email, roles),
  };
});

describe('pm-create-user-form — role selection', { tags: ['213UC4'] }, () => {
  let el: PmCreateUserForm;

  beforeEach(() => {
    el = new PmCreateUserForm();
    document.body.appendChild(el);
    mockCreateUser.mockReset();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders a checkbox for every assignable role, with only Teacher checked by default', () => {
    const shadow = el.shadowRoot!;

    for (const role of ALL_ROLES) {
      const checkbox = shadow.getElementById(`role${role}`) as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.checked).toBe(role === 'Teacher');
    }
  });

  it('submits Coordinator in the roles list when its checkbox is ticked', async () => {
    mockCreateUser.mockResolvedValueOnce({ userId: 'new-user-id', inviteUrl: '/#/register?token=abc' });

    const shadow = el.shadowRoot!;
    (shadow.getElementById('email') as HTMLInputElement).value = 'coordinator@test.com';
    (shadow.getElementById('roleCoordinator') as HTMLInputElement).click();
    shadow.getElementById('createUserForm')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        'coordinator@test.com',
        expect.arrayContaining(['Teacher', 'Coordinator']),
      );
    });
  });
});

describe('pm-create-user-form — Banking Coordinator role', { tags: ['287UC3'] }, () => {
  let el: PmCreateUserForm;

  beforeEach(() => {
    el = new PmCreateUserForm();
    document.body.appendChild(el);
    mockCreateUser.mockReset();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders a Banking Coordinator checkbox alongside Teacher, Coordinator and Admin', () => {
    const shadow = el.shadowRoot!;

    const checkbox = shadow.getElementById('roleBankingCoordinator') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
  });
});
