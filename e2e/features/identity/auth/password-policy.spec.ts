import { test, expect } from '../../../fixtures/base';
import { uniqueTestEmail, inviteUser, createRegisteredUser } from '../../../fixtures/testUsers';
import { waitForPasswordResetLink } from '../../../fixtures/mailbox';
import { extractTokenFromUrl } from '../../../fixtures/url';
import { RegistrationPage } from '../../../pages/identity/auth/RegistrationPage';
import { ForgotPasswordPage } from '../../../pages/identity/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../../pages/identity/auth/ResetPasswordPage';

const NO_COMPOSITION_PASSWORD = 'alllowercaseletters';
const DENYLISTED_PASSWORD = 'iloveyou';
const ORIGINAL_PASSWORD = 'OriginalPass123';

test.describe('Password Policy Compliance', { tag: '@M1.4IT4' }, () => {
  test('accepts a registration password with no character-class mix', async ({ page }) => {
    const email = uniqueTestEmail('password-policy-register-accept');
    const token = await inviteUser(page, email);

    const registrationPage = new RegistrationPage(page);
    await registrationPage.gotoRegister(token);
    await registrationPage.register(NO_COMPOSITION_PASSWORD, NO_COMPOSITION_PASSWORD);

    await expect(registrationPage.successBanner).toBeVisible();
  });

  test('rejects a denylisted registration password with a clear error', async ({ page }) => {
    const email = uniqueTestEmail('password-policy-register-reject');
    const token = await inviteUser(page, email);

    const registrationPage = new RegistrationPage(page);
    await registrationPage.gotoRegister(token);
    await registrationPage.register(DENYLISTED_PASSWORD, DENYLISTED_PASSWORD);

    await expect(registrationPage.errorBanner).toBeVisible();
    await expect(registrationPage.errorText).toContainText('too common');
  });

  test('accepts a reset password with no character-class mix', async ({ page }) => {
    const email = uniqueTestEmail('password-policy-reset-accept');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.gotoForgotPassword();
    await forgotPasswordPage.requestReset(email);
    await expect(forgotPasswordPage.successBanner).toBeVisible();

    const resetLink = await waitForPasswordResetLink(email);
    const resetToken = extractTokenFromUrl(resetLink);

    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.gotoReset(resetToken);
    await resetPasswordPage.resetPassword(NO_COMPOSITION_PASSWORD, NO_COMPOSITION_PASSWORD);

    await expect(page).toHaveURL(/#\/login$/);
  });

  test('rejects a denylisted reset password with a clear error', async ({ page }) => {
    const email = uniqueTestEmail('password-policy-reset-reject');
    await createRegisteredUser(page, email, ORIGINAL_PASSWORD);

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.gotoForgotPassword();
    await forgotPasswordPage.requestReset(email);
    await expect(forgotPasswordPage.successBanner).toBeVisible();

    const resetLink = await waitForPasswordResetLink(email);
    const resetToken = extractTokenFromUrl(resetLink);

    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.gotoReset(resetToken);
    await resetPasswordPage.resetPassword(DENYLISTED_PASSWORD, DENYLISTED_PASSWORD);

    await expect(resetPasswordPage.errorBanner).toBeVisible();
    await expect(resetPasswordPage.errorText).toContainText('too common');
    await expect(resetPasswordPage.invalidBanner).toBeHidden();
  });
});
