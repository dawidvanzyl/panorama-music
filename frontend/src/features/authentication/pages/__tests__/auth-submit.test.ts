import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formButtonStyles } from '../../../../components/form-button-styles';
import { PmLoginPage } from '../pm-login-page';
import { PmForgotPasswordPage } from '../pm-forgot-password-page';
import { PmResetPasswordPage } from '../pm-reset-password-page';
import { PmRegistrationPage } from '../pm-registration-page';

const mockLogin = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockCompleteRegistration = vi.fn();

vi.mock('../../../../services/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  completeRegistration: (...args: unknown[]) => mockCompleteRegistration(...args),
  AuthError: class AuthError extends Error {
    constructor(
      message: string,
      public status: number,
      public validationErrors: unknown[] = [],
    ) {
      super(message);
      this.name = 'AuthError';
    }
  },
}));

vi.mock('../../../../services/password-policy', () => ({
  evaluatePasswordPolicy: () => ({ minLength: false }),
}));

const { AuthError } = await import('../../../../services/auth');

interface PageCase {
  name: string;
  label: string;
  errorBannerClass: string;
  mount(): HTMLElement;
  fill(root: ShadowRoot): void;
  mismatch?(root: ShadowRoot): void;
  mock: ReturnType<typeof vi.fn>;
  failure: unknown;
}

function input(root: ShadowRoot, id: string, value: string): void {
  (root.getElementById(id) as HTMLInputElement).value = value;
}

function submit(root: ShadowRoot, formId: string): void {
  (root.getElementById(formId) as HTMLFormElement).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  );
}

function ownText(button: HTMLElement): string {
  return Array.from(button.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
}

function expectBusy(button: HTMLButtonElement, label: string): void {
  expect(button.disabled).toBe(true);
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(ownText(button)).toBe(label);
  expect(button.children).toHaveLength(1);
  expect((button.children[0] as HTMLElement).dataset.testid).toBe('button-loading-icon');
}

function expectIdle(button: HTMLButtonElement, label: string): void {
  expect(button.disabled).toBe(false);
  expect(button.hasAttribute('aria-busy')).toBe(false);
  expect(ownText(button)).toBe(label);
  expect(button.children).toHaveLength(0);
}

function deferred(): { promise: Promise<unknown>; resolve: () => void; reject: (reason: unknown) => void } {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((res, rej) => {
    resolve = () => res(undefined);
    reject = rej;
  });
  return { promise, resolve, reject };
}

const cases: PageCase[] = [
  {
    name: 'sign-in page',
    label: 'Sign In',
    errorBannerClass: 'login__error-banner--visible',
    mount: () => {
      const el = new PmLoginPage();
      document.body.appendChild(el);
      return el;
    },
    fill: (root) => {
      input(root, 'email', 'user@test.com');
      input(root, 'password', 'Secret123!');
    },
    mock: mockLogin,
    failure: new AuthError('Invalid', 401),
  },
  {
    name: 'forgot-password page',
    label: 'Send Reset Link',
    errorBannerClass: 'forgot__error-banner--visible',
    mount: () => {
      const el = new PmForgotPasswordPage();
      document.body.appendChild(el);
      return el;
    },
    fill: (root) => input(root, 'email', 'user@test.com'),
    mock: mockForgotPassword,
    failure: new Error('Network error'),
  },
  {
    name: 'reset-password page',
    label: 'Complete Password Reset',
    errorBannerClass: 'reset__error-banner--visible',
    mount: () => {
      window.location.hash = '#/reset-password?token=abc';
      const el = new PmResetPasswordPage();
      document.body.appendChild(el);
      return el;
    },
    fill: (root) => {
      input(root, 'password', 'NewPass123!');
      input(root, 'confirmPassword', 'NewPass123!');
    },
    mismatch: (root) => {
      input(root, 'password', 'NewPass123!');
      input(root, 'confirmPassword', 'Different123!');
    },
    mock: mockResetPassword,
    failure: new AuthError('Password too weak', 400),
  },
  {
    name: 'registration page',
    label: 'Complete Setup',
    errorBannerClass: 'registration__error-banner--visible',
    mount: () => {
      window.location.hash = '#/register?token=abc';
      const el = new PmRegistrationPage();
      document.body.appendChild(el);
      return el;
    },
    fill: (root) => {
      input(root, 'password', 'NewPass123!');
      input(root, 'confirmPassword', 'NewPass123!');
    },
    mismatch: (root) => {
      input(root, 'password', 'NewPass123!');
      input(root, 'confirmPassword', 'Different123!');
    },
    mock: mockCompleteRegistration,
    failure: new AuthError('Password too weak', 400),
  },
];

const formIds: Record<string, string> = {
  'sign-in page': 'loginForm',
  'forgot-password page': 'forgotForm',
  'reset-password page': 'resetForm',
  'registration page': 'registrationForm',
};

let el: HTMLElement | null = null;

beforeEach(() => {
  for (const testCase of cases) testCase.mock.mockReset();
});

afterEach(() => {
  el?.remove();
  el = null;
});

function open(testCase: PageCase): { root: ShadowRoot; button: HTMLButtonElement; formId: string } {
  el = testCase.mount();
  const root = el.shadowRoot!;
  return { root, button: root.getElementById('submitBtn') as HTMLButtonElement, formId: formIds[testCase.name] };
}

describe('the sign-in page submit while its request runs', { tags: ['381UC1'] }, () => {
  it('is disabled and busy, keeps Sign In and shows only the loading icon', () => {
    const request = deferred();
    mockLogin.mockReturnValueOnce(request.promise);
    const { root, button, formId } = open(cases[0]);
    cases[0].fill(root);

    submit(root, formId);

    expectBusy(button, 'Sign In');
  });

  it('sends no second request when submitted again while the first is pending', () => {
    const request = deferred();
    mockLogin.mockReturnValueOnce(request.promise);
    const { root, formId } = open(cases[0]);
    cases[0].fill(root);

    submit(root, formId);
    submit(root, formId);

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});

describe('the forgot-password page submit while its request runs', { tags: ['381UC2'] }, () => {
  it('is disabled and busy, keeps Send Reset Link and shows only the loading icon', () => {
    mockForgotPassword.mockReturnValueOnce(deferred().promise);
    const { root, button, formId } = open(cases[1]);
    cases[1].fill(root);

    submit(root, formId);

    expectBusy(button, 'Send Reset Link');
  });

  it('sends no second request when submitted again while the first is pending', () => {
    mockForgotPassword.mockReturnValueOnce(deferred().promise);
    const { root, formId } = open(cases[1]);
    cases[1].fill(root);

    submit(root, formId);
    submit(root, formId);

    expect(mockForgotPassword).toHaveBeenCalledTimes(1);
  });
});

describe('the reset-password page submit while its request runs', { tags: ['381UC3'] }, () => {
  it('is disabled and busy, keeps Complete Password Reset and shows only the loading icon', () => {
    mockResetPassword.mockReturnValueOnce(deferred().promise);
    const { root, button, formId } = open(cases[2]);
    cases[2].fill(root);

    submit(root, formId);

    expectBusy(button, 'Complete Password Reset');
  });

  it('sends no second request when submitted again while the first is pending', () => {
    mockResetPassword.mockReturnValueOnce(deferred().promise);
    const { root, formId } = open(cases[2]);
    cases[2].fill(root);

    submit(root, formId);
    submit(root, formId);

    expect(mockResetPassword).toHaveBeenCalledTimes(1);
  });

  it('never enters the busy state when the passwords do not match', () => {
    const { root, button, formId } = open(cases[2]);
    cases[2].mismatch!(root);

    submit(root, formId);

    expect(mockResetPassword).not.toHaveBeenCalled();
    expectIdle(button, 'Complete Password Reset');
  });
});

describe('the registration page submit while its request runs', { tags: ['381UC4'] }, () => {
  it('is disabled and busy, keeps Complete Setup and shows only the loading icon', () => {
    mockCompleteRegistration.mockReturnValueOnce(deferred().promise);
    const { root, button, formId } = open(cases[3]);
    cases[3].fill(root);

    submit(root, formId);

    expectBusy(button, 'Complete Setup');
  });

  it('sends no second request when submitted again while the first is pending', () => {
    mockCompleteRegistration.mockReturnValueOnce(deferred().promise);
    const { root, formId } = open(cases[3]);
    cases[3].fill(root);

    submit(root, formId);
    submit(root, formId);

    expect(mockCompleteRegistration).toHaveBeenCalledTimes(1);
  });

  it('never enters the busy state when the passwords do not match', () => {
    const { root, button, formId } = open(cases[3]);
    cases[3].mismatch!(root);

    submit(root, formId);

    expect(mockCompleteRegistration).not.toHaveBeenCalled();
    expectIdle(button, 'Complete Setup');
  });
});

describe('every auth page submit at rest', { tags: ['381UC5'] }, () => {
  it.each(cases)('$name has a full-width form primary button with text only', (testCase) => {
    const { root, button } = open(testCase);

    expect(root.adoptedStyleSheets).toContain(formButtonStyles);
    expect(button.classList.contains('form-btn')).toBe(true);
    expect(button.classList.contains('form-btn--primary')).toBe(true);
    expectIdle(button, testCase.label);
  });
});

describe('every auth page submit when its request ends', { tags: ['381UC6'] }, () => {
  it.each(cases)('$name returns to normal with its label and shows the error', async (testCase) => {
    const request = deferred();
    testCase.mock.mockReturnValueOnce(request.promise);
    const { root, button, formId } = open(testCase);
    testCase.fill(root);

    submit(root, formId);
    expectBusy(button, testCase.label);
    request.reject(testCase.failure);

    await vi.waitFor(() => expectIdle(button, testCase.label));
    expect(root.getElementById('errorMsg')!.classList.contains(testCase.errorBannerClass)).toBe(true);
  });

  it('the reset-password page shows the invalid-link banner and returns to normal on a 401', async () => {
    const request = deferred();
    mockResetPassword.mockReturnValueOnce(request.promise);
    const { root, button, formId } = open(cases[2]);
    cases[2].fill(root);

    submit(root, formId);
    request.reject(new AuthError('Expired', 401));

    await vi.waitFor(() => expectIdle(button, 'Complete Password Reset'));
    expect(root.getElementById('invalidBanner')!.classList.contains('reset__invalid-banner--visible')).toBe(true);
  });

  it('the sign-in page accepts a new submit after a failure', async () => {
    mockLogin.mockRejectedValueOnce(new AuthError('Invalid', 401)).mockReturnValueOnce(deferred().promise);
    const { root, button, formId } = open(cases[0]);
    cases[0].fill(root);

    submit(root, formId);
    await vi.waitFor(() => expectIdle(button, 'Sign In'));
    submit(root, formId);

    expect(mockLogin).toHaveBeenCalledTimes(2);
    expectBusy(button, 'Sign In');
  });
});
