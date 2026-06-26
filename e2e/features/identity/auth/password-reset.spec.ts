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

test.describe('Password Reset Flow', { tag: '@M1.2IT3' }, () => {
  test('requests a reset, follows the link, and logs in with the new password', async ({ page }) => {
    const email = uniqueTestEmail('password-reset-valid');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.gotoForgotPassword();
    await forgotPasswordPage.requestReset(email);
    await expect(forgotPasswordPage.successBanner).toBeVisible();

    const resetLink = await waitForPasswordResetLink(email);
    const resetToken = extractTokenFromUrl(resetLink);

    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.gotoReset(resetToken);
    await resetPasswordPage.resetPassword(NEW_PASSWORD, NEW_PASSWORD);

    await expect(page).toHaveURL(/#\/login$/);

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.login(email, NEW_PASSWORD);

    await expect(page).toHaveURL(/#\/$/);
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('rejects a reset token that has already been used and does not change the password again', async ({
    page,
  }) => {
    const email = uniqueTestEmail('password-reset-used');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.gotoForgotPassword();
    await forgotPasswordPage.requestReset(email);
    await expect(forgotPasswordPage.successBanner).toBeVisible();

    const resetLink = await waitForPasswordResetLink(email);
    const resetToken = extractTokenFromUrl(resetLink);

    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.gotoReset(resetToken);
    await resetPasswordPage.resetPassword(NEW_PASSWORD, NEW_PASSWORD);
    await expect(page).toHaveURL(/#\/login$/);

    await resetPasswordPage.gotoReset(resetToken);
    await resetPasswordPage.resetPassword('SecondAttempt789', 'SecondAttempt789');

    await expect(resetPasswordPage.invalidBanner).toBeVisible();

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(email, NEW_PASSWORD);
    await expect(dashboardPage.heading).toBeVisible();
  });
});
