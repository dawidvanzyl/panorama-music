import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/base';
import {
  createRegisteredUser,
  getAdminAccessToken,
  uniqueTestEmail,
} from '../../../fixtures/testUsers';
import { waitForPasswordResetLink } from '../../../fixtures/mailbox';
import { extractTokenFromUrl } from '../../../fixtures/url';
import { landingUrl } from '../../../fixtures/navigation';
import {
  countPosts,
  expectSubmitAtRest,
  expectSubmitLoading,
  holdPost,
} from '../../../fixtures/authSubmit';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { ForgotPasswordPage } from '../../../pages/identity/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../../pages/identity/auth/ResetPasswordPage';
import { RegistrationPage } from '../../../pages/identity/auth/RegistrationPage';

const PASSWORD = 'SubmitPass123!';
const WRONG_PASSWORD = 'WrongPass456!';
const NEW_PASSWORD = 'FreshPass789!';

test.describe(
  'Auth submit — the sign-in button keeps its label while the request runs',
  { tag: ['@267IT28'] },
  () => {
    test('at rest, then in flight, then signed in', async ({ page }) => {
      const email = uniqueTestEmail('submit-login');
      await createRegisteredUser(page, email, PASSWORD);
      const loginPage = new LoginPage(page);
      await loginPage.gotoLogin();
      await expectSubmitAtRest(loginPage.submitButton, 'Sign In');

      const held = await holdPost(page, '/api/auth/login');
      try {
        await loginPage.login(email, PASSWORD);

        await expectSubmitLoading(loginPage.submitButton, 'Sign In');
        await expect(page.getByText('Authenticating')).toHaveCount(0);
        expect(held.count()).toBe(1);
      } finally {
        held.release();
      }

      await expect(page).toHaveURL(landingUrl('Teacher'));
    });
  },
);

test.describe(
  'Auth submit — the forgot-password button keeps its label while the request runs',
  { tag: ['@267IT29'] },
  () => {
    test('in flight, then the success banner', async ({ page }) => {
      const forgotPasswordPage = new ForgotPasswordPage(page);
      await forgotPasswordPage.gotoForgotPassword();
      await expectSubmitAtRest(forgotPasswordPage.submitButton, 'Send Reset Link');

      const held = await holdPost(page, '/api/auth/forgot-password');
      try {
        await forgotPasswordPage.requestReset(uniqueTestEmail('submit-forgot'));

        await expectSubmitLoading(forgotPasswordPage.submitButton, 'Send Reset Link');
        await expect(page.getByText('Sending')).toHaveCount(0);
      } finally {
        held.release();
      }

      await expect(forgotPasswordPage.successBanner).toBeVisible();
      await expect(forgotPasswordPage.submitButton).toBeEnabled();
      await expect(forgotPasswordPage.submitButton.locator(':scope > *')).toHaveCount(0);
    });
  },
);

async function seedResetToken(page: Page): Promise<string> {
  const email = uniqueTestEmail('submit-pwd');
  await createRegisteredUser(page, email, PASSWORD);
  const requested = await page.request.post('/api/auth/forgot-password', { data: { email } });
  expect(requested.ok()).toBe(true);
  return extractTokenFromUrl(await waitForPasswordResetLink(email));
}

test.describe(
  'Auth submit — the reset-password button keeps its label while the request runs',
  { tag: ['@267IT30'] },
  () => {
    test('in flight with a real reset link', async ({ page }) => {
      const token = await seedResetToken(page);
      const resetPage = new ResetPasswordPage(page);
      await resetPage.gotoReset(token);
      await expectSubmitAtRest(resetPage.submitButton, 'Complete Password Reset');
      await expect(page.getByRole('button', { name: 'Reset Password', exact: true })).toHaveCount(0);

      const held = await holdPost(page, '/api/auth/reset-password');
      try {
        await resetPage.resetPassword(NEW_PASSWORD, NEW_PASSWORD);

        await expectSubmitLoading(resetPage.submitButton, 'Complete Password Reset');
      } finally {
        held.release();
      }

      await expect(page).toHaveURL(/#\/login$/);
    });

    test('mismatched passwords never enter the loading state', async ({ page }) => {
      const resetPage = new ResetPasswordPage(page);
      await resetPage.gotoReset('not-a-real-token');
      await expectSubmitAtRest(resetPage.submitButton, 'Complete Password Reset');
      const sent = countPosts(page, '/api/auth/reset-password');

      await resetPage.resetPassword(NEW_PASSWORD, `${NEW_PASSWORD}x`);

      await expect(resetPage.errorText).toHaveText('Passwords do not match');
      await expectSubmitAtRest(resetPage.submitButton, 'Complete Password Reset');
      expect(sent()).toBe(0);
    });
  },
);

async function seedInviteToken(page: Page): Promise<string> {
  const accessToken = await getAdminAccessToken(page);
  const created = await page.request.post('/api/users', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { email: uniqueTestEmail('submit-invite'), roles: ['Teacher'] },
  });
  expect(created.status()).toBe(201);
  const { inviteUrl } = (await created.json()) as { inviteUrl: string };
  return extractTokenFromUrl(inviteUrl);
}

test.describe(
  'Auth submit — the registration button keeps its label while the request runs',
  { tag: ['@267IT31'] },
  () => {
    test('in flight, then the success banner', async ({ page }) => {
      const token = await seedInviteToken(page);
      const registrationPage = new RegistrationPage(page);
      await registrationPage.gotoRegister(token);
      await expectSubmitAtRest(registrationPage.submitButton, 'Complete Setup');

      const held = await holdPost(page, '/api/auth/complete-registration');
      try {
        await registrationPage.register(PASSWORD, PASSWORD);

        await expectSubmitLoading(registrationPage.submitButton, 'Complete Setup');
        await expect(page.getByText('Activating')).toHaveCount(0);
      } finally {
        held.release();
      }

      await expect(registrationPage.successBanner).toBeVisible();
      await expect(page).toHaveURL(/#\/login\?registered=true$/);
    });

    test('mismatched passwords never enter the loading state', async ({ page }) => {
      const token = await seedInviteToken(page);
      const registrationPage = new RegistrationPage(page);
      await registrationPage.gotoRegister(token);
      await expectSubmitAtRest(registrationPage.submitButton, 'Complete Setup');
      const sent = countPosts(page, '/api/auth/complete-registration');

      await registrationPage.register(PASSWORD, `${PASSWORD}x`);

      await expect(registrationPage.errorText).toHaveText('Passwords do not match');
      await expectSubmitAtRest(registrationPage.submitButton, 'Complete Setup');
      expect(sent()).toBe(0);
    });
  },
);

test.describe(
  'Auth submit — the sign-in button is restored when the request fails',
  { tag: ['@267IT32'] },
  () => {
    test('wrong password, then the button is back', async ({ page }) => {
      const email = uniqueTestEmail('submit-wrong');
      await createRegisteredUser(page, email, PASSWORD);
      const loginPage = new LoginPage(page);
      await loginPage.gotoLogin();

      await loginPage.login(email, WRONG_PASSWORD);

      await expect(loginPage.errorText).toHaveText('Invalid email or password');
      await expectSubmitAtRest(loginPage.submitButton, 'Sign In');
      await expect(page).toHaveURL(/#\/login/);
    });

    test('the restored button works', async ({ page }) => {
      const email = uniqueTestEmail('submit-retry');
      await createRegisteredUser(page, email, PASSWORD);
      const loginPage = new LoginPage(page);
      await loginPage.gotoLogin();
      await loginPage.login(email, WRONG_PASSWORD);
      await expect(loginPage.errorText).toHaveText('Invalid email or password');
      await expectSubmitAtRest(loginPage.submitButton, 'Sign In');

      await loginPage.passwordInput.fill(PASSWORD);
      await loginPage.submitButton.click();

      await expect(page).toHaveURL(landingUrl('Teacher'));
    });
  },
);
