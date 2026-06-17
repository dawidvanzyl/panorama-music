import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmForgotPasswordPage } from '../pm-forgot-password-page';

const mockForgotPassword = vi.fn();
vi.mock('../../services/auth', () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  AuthError: class AuthError extends Error {
    constructor(message: string, public status: number) {
      super(message);
      this.name = 'AuthError';
    }
  },
}));

describe('pm-forgot-password-page', { tags: ['M1.1UC9'] }, () => {
  let el: PmForgotPasswordPage;

  beforeEach(() => {
    mockForgotPassword.mockReset();
    el = new PmForgotPasswordPage();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders the email form initially', () => {
    const shadow = el.shadowRoot!;
    expect(shadow.getElementById('forgotForm')).not.toBeNull();
    expect(shadow.getElementById('email')).not.toBeNull();
    expect(shadow.getElementById('submitBtn')).not.toBeNull();
  });

  it('shows success banner and resets form after successful submission', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);

    const shadow = el.shadowRoot!;
    const form = shadow.getElementById('forgotForm') as HTMLFormElement;
    const emailInput = shadow.getElementById('email') as HTMLInputElement;

    emailInput.value = 'user@test.com';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const banner = shadow.getElementById('successMsg')!;
      expect(banner.classList.contains('forgot__success-banner--visible')).toBe(true);
    });
  });

  it('calls forgotPassword with the entered email', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);

    const shadow = el.shadowRoot!;
    const form = shadow.getElementById('forgotForm') as HTMLFormElement;
    const emailInput = shadow.getElementById('email') as HTMLInputElement;

    emailInput.value = 'send@test.com';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('send@test.com');
    });
  });

  it('shows error banner on unexpected failure', async () => {
    mockForgotPassword.mockRejectedValueOnce(new Error('Network error'));

    const shadow = el.shadowRoot!;
    const form = shadow.getElementById('forgotForm') as HTMLFormElement;
    const emailInput = shadow.getElementById('email') as HTMLInputElement;

    emailInput.value = 'fail@test.com';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const banner = shadow.getElementById('errorMsg')!;
      expect(banner.classList.contains('forgot__error-banner--visible')).toBe(true);
    });
  });

  it('re-enables submit button after completion', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);

    const shadow = el.shadowRoot!;
    const form = shadow.getElementById('forgotForm') as HTMLFormElement;
    const submitBtn = shadow.getElementById('submitBtn') as HTMLButtonElement;
    const emailInput = shadow.getElementById('email') as HTMLInputElement;

    emailInput.value = 'user@test.com';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(submitBtn.disabled).toBe(false);
    });
  });
});
