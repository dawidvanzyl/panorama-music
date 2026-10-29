import type { Browser, BrowserContext, Page } from '@playwright/test';
import { expect } from './base';
import { createRegisteredUser, uniqueTestEmail } from './testUsers';
import { landingUrl } from './navigation';
import { LoginPage } from '../pages/identity/auth/LoginPage';

export interface OtherUser {
  email: string;
  accessToken: string;
  context: BrowserContext;
}

/** Registers a user and signs them in in a second browser context, so their session is active. */
export async function signInOtherUser(
  page: Page,
  browser: Browser,
  label: string,
  password: string,
): Promise<OtherUser> {
  const email = uniqueTestEmail(label);
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
