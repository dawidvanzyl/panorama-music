import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockLogout = vi.fn();
vi.mock('../../services/auth', () => ({
  logout: () => mockLogout(),
}));

import '../pm-logout-menu';

describe('account chip — Logout ends the session and returns to the login screen', { tags: ['247UC4'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockLogout.mockReset();
    mockLogout.mockResolvedValue(undefined);
    window.location.hash = '#/students';
    el = document.createElement('pm-logout-menu');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('offers Logout as a menu item', () => {
    const logoutBtn = el.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement;

    expect(logoutBtn.textContent).toContain('Logout');
    expect(logoutBtn.getAttribute('role')).toBe('menuitem');
  });

  it('calls logout once and redirects to the login screen', async () => {
    (el.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement).click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/login');
  });

  it('waits for logout to finish before redirecting', async () => {
    // Redirecting first would race the request: the login screen would render
    // while the session it is replacing is still being ended.
    let endSession: (() => void) | undefined;
    mockLogout.mockReturnValue(
      new Promise<void>((resolve) => {
        endSession = resolve;
      }),
    );

    (el.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement).click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(window.location.hash).toBe('#/students');

    endSession!();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(window.location.hash).toBe('#/login');
  });

  it('still returns to the login screen when the logout request fails', async () => {
    // `logout()` clears the tokens in a `finally` before rethrowing, so the
    // session is over either way — staying put would strand the user on an
    // authenticated screen with no session.
    mockLogout.mockRejectedValue(new Error('network down'));

    (el.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement).click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(window.location.hash).toBe('#/login');
  });

  it('ignores a second click while the first logout is still in flight', async () => {
    let endSession: (() => void) | undefined;
    mockLogout.mockReturnValue(
      new Promise<void>((resolve) => {
        endSession = resolve;
      }),
    );

    const logoutBtn = el.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement;
    logoutBtn.click();
    logoutBtn.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockLogout).toHaveBeenCalledTimes(1);

    endSession!();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
});
