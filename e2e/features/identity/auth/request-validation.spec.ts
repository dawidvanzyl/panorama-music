import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser } from '../../../fixtures/testUsers';
import { waitForPasswordResetLink } from '../../../fixtures/mailbox';
import { extractTokenFromUrl } from '../../../fixtures/url';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { DashboardPage } from '../../../pages/identity/auth/DashboardPage';
import { ForgotPasswordPage } from '../../../pages/identity/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../../pages/identity/auth/ResetPasswordPage';

const ORIGINAL_PASSWORD = 'OriginalPass123';
const NEW_PASSWORD = 'NewPass456';

test.describe('Identity Request Validation', () => {
  test(
    'rejects a request that fails FluentValidation before the handler runs, then accepts a corrected one',
    { tag: ['@M1.3IT1', '@M1.3IT2'] },
    async ({ page }) => {
      const email = uniqueTestEmail('request-validation');
      await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

      const forgotPasswordPage = new ForgotPasswordPage(page);
      await forgotPasswordPage.gotoForgotPassword();
      await forgotPasswordPage.requestReset(email);
      await expect(forgotPasswordPage.successBanner).toBeVisible();

      const resetLink = await waitForPasswordResetLink(email);
      const resetToken = extractTokenFromUrl(resetLink);

      const resetPasswordPage = new ResetPasswordPage(page);
      await resetPasswordPage.gotoReset(resetToken);

      // M1.3IT1: a password that fails the validator's policy rules (too
      // short, no mixed case, no digit) is rejected with the standardized
      // 400 validation-failure response, surfaced inline rather than as the
      // invalid-token banner.
      await resetPasswordPage.resetPassword('weak', 'weak');

      await expect(resetPasswordPage.errorBanner).toBeVisible();
      await expect(resetPasswordPage.errorText).toContainText('8 characters');
      await expect(resetPasswordPage.errorText).toContainText('mixed case');
      await expect(resetPasswordPage.errorText).toContainText('digit');
      await expect(resetPasswordPage.invalidBanner).toBeHidden();

      // The reset token must still be unconsumed — proof the route handler
      // was never invoked for the rejected request, not just that the UI
      // showed an error. Reusing the same already-loaded form (no token
      // round-trip) and submitting a policy-compliant password (M1.3IT2)
      // succeeds, which would fail with "invalid or expired" had the first,
      // invalid attempt reached and consumed the token.
      await resetPasswordPage.resetPassword(NEW_PASSWORD, NEW_PASSWORD);
      await expect(page).toHaveURL(/#\/login$/);

      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      await loginPage.login(email, NEW_PASSWORD);

      await expect(page).toHaveURL(/#\/$/);
      await expect(dashboardPage.heading).toBeVisible();
    }
  );
});
