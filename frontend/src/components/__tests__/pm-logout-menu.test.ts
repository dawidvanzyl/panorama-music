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
});
