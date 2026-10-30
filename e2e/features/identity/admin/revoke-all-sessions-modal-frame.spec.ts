import type { Browser, BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/base';
import { createRegisteredUser, loginAsRoles, uniqueTestEmail } from '../../../fixtures/testUsers';
import { clickBackdropLeftThenAbove, countRequests } from '../../../fixtures/modalFrame';
import { landingUrl } from '../../../fixtures/navigation';
import { LoginPage } from '../../../pages/identity/auth/LoginPage';
import { AdminSessionsPage } from '../../../pages/identity/admin/AdminSessionsPage';

const REVOKE_ALL_PATH = '/api/auth/admin/sessions/all';

interface OtherUser {
  email: string;
  accessToken: string;
  context: BrowserContext;
}

/** Registers a user and signs them in in a second browser context, so their session is active. */
async function signInOtherUser(page: Page, browser: Browser): Promise<OtherUser> {
  const email = uniqueTestEmail('modal-frame');
  const password = 'ModalFrame123';
  await createRegisteredUser(page, email, password);

  const context = await browser.newContext();
  const otherPage = await context.newPage();
  const otherLoginPage = new LoginPage(otherPage);
  await otherLoginPage.gotoLogin();
  await otherLoginPage.login(email, password);
  await expect(otherPage).toHaveURL(landingUrl('Teacher'));
  const accessToken = await otherPage.evaluate(() => localStorage.getItem('pm_access_token'));
  return { email, accessToken: accessToken ?? '', context };
}

function revokeAllModal(page: Page) {
  const host = page.locator('#revokeAllModal');
  return {
    host,
    card: host.locator('.modal__card'),
    close: host.getByRole('button', { name: 'Close', exact: true }),
    field: host.locator('#confirmInput'),
    confirm: host.locator('#revokeAllBtn'),
  };
}

test.describe('Revoke All Sessions modal — close control', { tag: ['@266IT36'] }, () => {
  async function openWithPhraseTyped(page: Page, browser: Browser) {
    const other = await signInOtherUser(page, browser);
    await loginAsRoles(page, ['Admin']);
    const deletesSent = countRequests(page, 'DELETE', REVOKE_ALL_PATH);
    const sessionsPage = new AdminSessionsPage(page);
    await sessionsPage.gotoAdminSessions();
    await expect(sessionsPage.heading).toBeVisible();
    await sessionsPage.filterInput.fill(other.email);
    await expect(sessionsPage.rowByEmail(other.email)).toHaveCount(1);

    await sessionsPage.revokeAllBtn.click();
    const modal = revokeAllModal(page);
    await expect(modal.card).toBeVisible();
    await modal.field.fill('REVOKE ALL');
    await expect(modal.confirm).toBeEnabled();
    return { other, sessionsPage, modal, deletesSent };
  }

  test('close with the phrase typed revokes nothing', async ({ page, browser }) => {
    const { other, sessionsPage, modal, deletesSent } = await openWithPhraseTyped(page, browser);
    await expect(modal.host.locator('.modal__header').getByRole('button', { name: 'Close', exact: true })).toHaveCount(1);

    await modal.close.click();

    await expect(modal.card).toBeHidden();
    expect(deletesSent()).toBe(0);
    await expect(sessionsPage.rowByEmail(other.email)).toHaveCount(1);
    const response = await page.request.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${other.accessToken}` },
    });
    expect(response.status()).toBe(200);

    await other.context.close();
  });

  test('the session is still active after a reload', async ({ page, browser }) => {
    const { other, sessionsPage, modal } = await openWithPhraseTyped(page, browser);
    await modal.close.click();
    await expect(modal.card).toBeHidden();

    await page.reload();
    await expect(sessionsPage.heading).toBeVisible();
    await sessionsPage.filterInput.fill(other.email);

    await expect(sessionsPage.rowByEmail(other.email)).toHaveCount(1);

    await other.context.close();
  });

  test('reopening starts with an empty field and a disabled Revoke All', async ({
    page,
    browser,
  }) => {
    const { other, sessionsPage, modal } = await openWithPhraseTyped(page, browser);
    await modal.close.click();
    await expect(modal.card).toBeHidden();

    await sessionsPage.revokeAllBtn.click();

    await expect(modal.card).toBeVisible();
    await expect(modal.field).toHaveValue('');
    await expect(modal.confirm).toBeDisabled();

    await other.context.close();
  });
});

test.describe('Revoke All Sessions modal — backdrop and Escape', { tag: ['@266IT43'] }, () => {
  async function openWithPartialPhrase(page: Page) {
    await loginAsRoles(page, ['Admin']);
    const deletesSent = countRequests(page, 'DELETE', REVOKE_ALL_PATH);
    const sessionsPage = new AdminSessionsPage(page);
    await sessionsPage.gotoAdminSessions();
    await expect(sessionsPage.heading).toBeVisible();

    await sessionsPage.revokeAllBtn.click();
    const modal = revokeAllModal(page);
    await expect(modal.card).toBeVisible();
    await modal.field.fill('REVOKE');
    return { modal, deletesSent };
  }

  test('backdrop click, then Escape: the modal and the text stay', async ({ page }) => {
    const { modal, deletesSent } = await openWithPartialPhrase(page);

    await clickBackdropLeftThenAbove(page, modal.card, async () => {
      await expect(modal.card).toBeVisible();
      await expect(modal.field).toHaveValue('REVOKE');
    });
    await page.keyboard.press('Escape');

    await expect(modal.card).toBeVisible();
    await expect(modal.field).toHaveValue('REVOKE');
    expect(deletesSent()).toBe(0);
  });

  test('Escape with focus in the field', async ({ page }) => {
    const { modal } = await openWithPartialPhrase(page);
    await modal.field.click();

    await page.keyboard.press('Escape');

    await expect(modal.card).toBeVisible();
    await expect(modal.field).toHaveValue('REVOKE');
  });
});
