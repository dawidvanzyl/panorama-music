import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmResetPasswordPage } from '../pm-reset-password-page';

const mockResetPassword = vi.fn();
vi.mock('../../../../services/auth', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  AuthError: class AuthError extends Error {
    constructor(message: string, public status: number, public hasPolicyRules: boolean = false) {
      super(message);
      this.name = 'AuthError';
    }
  },
}));

vi.mock('../../../../services/password-policy', () => ({
  evaluatePasswordPolicy: () => ({ minLength: false, mixedCase: false, hasDigit: false }),
}));

describe('pm-reset-password-page', () => {
  let el: PmResetPasswordPage;

  beforeEach(() => {
    mockResetPassword.mockReset();
  });

  afterEach(() => {
    if (document.body.contains(el)) document.body.removeChild(el);
  });

  describe('with valid token in URL', { tags: ['M1.1UC10'] }, () => {
    beforeEach(() => {
      window.location.hash = '#/reset-password?token=valid-token-abc';
      el = new PmResetPasswordPage();
      document.body.appendChild(el);
    });

    it('renders the password form when token is present', () => {
      const shadow = el.shadowRoot!;
      expect(shadow.getElementById('resetForm')).not.toBeNull();
      const formArea = shadow.getElementById('formArea')!;
      expect(formArea.classList.contains('reset__form-area--hidden')).toBe(false);
    });

    it('redirects to login on successful reset', async () => {
      mockResetPassword.mockResolvedValueOnce(undefined);

      const shadow = el.shadowRoot!;
      const form = shadow.getElementById('resetForm') as HTMLFormElement;
      const passwordInput = shadow.getElementById('password') as HTMLInputElement;
      const confirmInput = shadow.getElementById('confirmPassword') as HTMLInputElement;

      passwordInput.value = 'NewPass123!';
      confirmInput.value = 'NewPass123!';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await vi.waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('valid-token-abc', 'NewPass123!');
      });
    });

    it('shows inline error when API returns 422 policy error', async () => {
      const { AuthError } = await import('../../../../services/auth');
      mockResetPassword.mockRejectedValueOnce(new AuthError('Password must be at least 8 characters.', 422, true));

      const shadow = el.shadowRoot!;
      const form = shadow.getElementById('resetForm') as HTMLFormElement;
      const passwordInput = shadow.getElementById('password') as HTMLInputElement;
      const confirmInput = shadow.getElementById('confirmPassword') as HTMLInputElement;

      passwordInput.value = 'weak';
      confirmInput.value = 'weak';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await vi.waitFor(() => {
        const errorBanner = shadow.getElementById('errorMsg')!;
        expect(errorBanner.classList.contains('reset__error-banner--visible')).toBe(true);
        const invalidBanner = shadow.getElementById('invalidBanner')!;
        expect(invalidBanner.classList.contains('reset__invalid-banner--visible')).toBe(false);
      });
    });

    it('shows error when passwords do not match', async () => {
      const shadow = el.shadowRoot!;
      const form = shadow.getElementById('resetForm') as HTMLFormElement;
      const passwordInput = shadow.getElementById('password') as HTMLInputElement;
      const confirmInput = shadow.getElementById('confirmPassword') as HTMLInputElement;

      passwordInput.value = 'NewPass123!';
      confirmInput.value = 'DifferentPass123!';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await vi.waitFor(() => {
        const errorBanner = shadow.getElementById('errorMsg')!;
        expect(errorBanner.classList.contains('reset__error-banner--visible')).toBe(true);
        expect(shadow.getElementById('errorText')!.textContent).toContain('do not match');
      });

      expect(mockResetPassword).not.toHaveBeenCalled();
    });
  });

  describe('invalid or expired token', { tags: ['M1.1UC11'] }, () => {
    it('shows invalid banner when no token in URL', () => {
      window.location.hash = '#/reset-password';
      el = new PmResetPasswordPage();
      document.body.appendChild(el);

      const shadow = el.shadowRoot!;
      const invalidBanner = shadow.getElementById('invalidBanner')!;
      expect(invalidBanner.classList.contains('reset__invalid-banner--visible')).toBe(true);
      const formArea = shadow.getElementById('formArea')!;
      expect(formArea.classList.contains('reset__form-area--hidden')).toBe(true);
    });

    it('shows invalid state when API returns 422 token error', async () => {
      window.location.hash = '#/reset-password?token=expired-token';
      el = new PmResetPasswordPage();
      document.body.appendChild(el);

      const { AuthError } = await import('../../../../services/auth');
      mockResetPassword.mockRejectedValueOnce(new AuthError('Password reset token is invalid or expired.', 422));

      const shadow = el.shadowRoot!;
      const form = shadow.getElementById('resetForm') as HTMLFormElement;
      const passwordInput = shadow.getElementById('password') as HTMLInputElement;
      const confirmInput = shadow.getElementById('confirmPassword') as HTMLInputElement;

      passwordInput.value = 'NewPass123!';
      confirmInput.value = 'NewPass123!';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await vi.waitFor(() => {
        const invalidBanner = shadow.getElementById('invalidBanner')!;
        expect(invalidBanner.classList.contains('reset__invalid-banner--visible')).toBe(true);
      });
    });
  });
});
