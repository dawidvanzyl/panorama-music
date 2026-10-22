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

describe('pm-create-user-form — loading state of Create User', { tags: ['378UC1'] }, () => {
  let el: PmCreateUserForm;

  beforeEach(() => {
    el = new PmCreateUserForm();
    document.body.appendChild(el);
    mockCreateUser.mockReset();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function submit(): void {
    const shadow = el.shadowRoot!;
    (shadow.getElementById('email') as HTMLInputElement).value = 'new@test.com';
    shadow.getElementById('createUserForm')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('disables Create User, keeps its label and shows the loading icon while the request runs', async () => {
    mockCreateUser.mockReturnValue(new Promise(() => undefined));

    submit();

    const button = el.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toContain('Create User');
    expect((button.firstElementChild as HTMLElement).dataset.testid).toBe('button-loading-icon');
  });

  it('does not enter the loading state when no role is selected', () => {
    el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box) => (box.checked = false));

    submit();

    const button = el.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });
});

describe('pm-create-user-form — Create User is ready again when the request ends', { tags: ['378UC2'] }, () => {
  let el: PmCreateUserForm;

  beforeEach(() => {
    el = new PmCreateUserForm();
    document.body.appendChild(el);
    mockCreateUser.mockReset();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it.each([
    ['succeeds', () => mockCreateUser.mockResolvedValue({ userId: 'u1', inviteUrl: '/#/register?token=abc' })],
    ['fails', () => mockCreateUser.mockRejectedValue(new Error('Refused.'))],
  ])('when the request %s', async (_outcome, arrange) => {
    arrange();
    const shadow = el.shadowRoot!;
    (shadow.getElementById('email') as HTMLInputElement).value = 'new@test.com';

    shadow.getElementById('createUserForm')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const button = shadow.getElementById('submitBtn') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
      expect(button.hasAttribute('aria-busy')).toBe(false);
      expect(button.querySelector('[data-testid="button-loading-icon"]')).toBeNull();
    });
  });
});
