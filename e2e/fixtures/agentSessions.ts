import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { expect } from './base';
import { createRegisteredUser, uniqueTestEmail } from './testUsers';
import { landingUrl } from './navigation';
import { LoginPage } from '../pages/identity/auth/LoginPage';

export const SESSIONS_PASSWORD = 'ConfirmRevoke482';

/** One signed-in browser context whose session is told apart by its user agent. */
export interface AgentSession {
  userAgent: string;
  accessToken: string;
  context: BrowserContext;
}

/** A user agent token that holds none of the words the specs assert on. */
export function uniqueUserAgent(): string {
  return `E2E-UA-${crypto.randomUUID().slice(0, 8)}`;
}

/** Signs the user in in a new browser context that sends its own user agent. */
export async function signInWithAgent(
  browser: Browser,
  email: string,
  password: string,
): Promise<AgentSession> {
  const userAgent = uniqueUserAgent();
  const context = await browser.newContext({ userAgent });
  const agentPage = await context.newPage();
  const loginPage = new LoginPage(agentPage);
  await loginPage.gotoLogin();
  await loginPage.login(email, password);
  await expect(agentPage).toHaveURL(landingUrl('Teacher'));
  const accessToken = await agentPage.evaluate(() => localStorage.getItem('pm_access_token'));
  return { userAgent, accessToken: accessToken ?? '', context };
}

export async function closeAll(sessions: AgentSession[]): Promise<void> {
  for (const session of sessions) await session.context.close().catch(() => undefined);
}

/** A Teacher with the given number of active sessions in other browser contexts. */
export async function seedTargetUser(
  page: Page,
  browser: Browser,
  label: string,
  sessionCount: number,
): Promise<{ email: string; sessions: AgentSession[] }> {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, SESSIONS_PASSWORD);
  const sessions: AgentSession[] = [];
  for (let i = 0; i < sessionCount; i += 1) {
    sessions.push(await signInWithAgent(browser, email, SESSIONS_PASSWORD));
  }
  return { email, sessions };
}

/** A Teacher signed in on `page`, who also has the given number of sessions in other contexts. */
export async function seedOwnSessionsUser(
  page: Page,
  browser: Browser,
  label: string,
  otherCount: number,
): Promise<{ email: string; ownToken: string; others: AgentSession[] }> {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, SESSIONS_PASSWORD);
  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, SESSIONS_PASSWORD);
  await expect(page).toHaveURL(landingUrl('Teacher'));
  const ownToken = await page.evaluate(() => localStorage.getItem('pm_access_token'));
  const others: AgentSession[] = [];
  for (let i = 0; i < otherCount; i += 1) {
    others.push(await signInWithAgent(browser, email, SESSIONS_PASSWORD));
  }
  return { email, ownToken: ownToken ?? '', others };
}

/** 200 while the session is active, 401 once it is revoked. */
export async function sessionStatus(page: Page, accessToken: string): Promise<number> {
  const response = await page.request.get('/api/auth/sessions', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.status();
}

/** Counts the requests of one method whose path the predicate accepts. */
export function countRequestsWhere(
  page: Page,
  method: string,
  accepts: (pathname: string) => boolean,
): () => number {
  let sent = 0;
  page.on('request', (request) => {
    if (request.method() === method && accepts(new URL(request.url()).pathname)) sent += 1;
  });
  return () => sent;
}

export const isOwnSingleRevoke = (pathname: string): boolean =>
  pathname.startsWith('/api/auth/sessions/') && pathname !== '/api/auth/sessions/others';

export const isOwnRevokeOthers = (pathname: string): boolean =>
  pathname === '/api/auth/sessions/others';

export const isAdminSingleRevoke = (pathname: string): boolean =>
  pathname.startsWith('/api/auth/admin/sessions/') && pathname !== '/api/auth/admin/sessions/all';

/**
 * The point at the centre of the modal's card, read with elementFromPoint,
 * belongs to the modal's host element: nothing paints above the card.
 */
export async function expectOnTop(page: Page, host: Locator, card: Locator): Promise<void> {
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box, 'the modal card has a box').not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const handle = await host.elementHandle();
  expect(handle, 'the modal host exists').not.toBeNull();
  const onTop = await page.evaluate(
    ([hostElement, px, py]) => document.elementFromPoint(px as number, py as number) === hostElement,
    [handle, x, y] as const,
  );
  expect(onTop, 'the confirmation paints above everything at its centre').toBe(true);
}
