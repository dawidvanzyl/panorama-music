import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockIsAuthenticated = vi.fn();
vi.mock('../../services/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  logout: vi.fn(),
}));

const mockHasRole = vi.fn();
vi.mock('../../services/token-storage', () => ({
  hasRole: () => mockHasRole(),
  hasAnyRole: () => mockHasRole(),
  getEmail: () => 'admin@panorama-music.com',
}));

vi.mock('../../features/admin/services/admin', () => ({
  clearUsersCache: vi.fn(),
}));

import '../pm-nav-bar';

describe('pm-nav-bar — active section and account chip', { tags: ['M1.4UC12'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    mockHasRole.mockReturnValue(true);
    el = document.createElement('pm-nav-bar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('marks Dashboard active on the dashboard route and Admin active under /admin', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const dashboardLink = el.shadowRoot!.getElementById('dashboardLink') as HTMLAnchorElement;
    const adminLink = el.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;

    expect(dashboardLink.classList.contains('nav-bar__section-link--active')).toBe(true);
    expect(adminLink.classList.contains('nav-bar__section-link--active')).toBe(false);

    window.location.hash = '#/admin/users';
    window.dispatchEvent(new Event('hashchange'));

    expect(dashboardLink.classList.contains('nav-bar__section-link--active')).toBe(false);
    expect(adminLink.classList.contains('nav-bar__section-link--active')).toBe(true);
  });

  it('keeps the Dashboard section highlighted when navigating to Active Sessions from Dashboard', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    window.location.hash = '#/sessions';
    window.dispatchEvent(new Event('hashchange'));

    const dashboardLink = el.shadowRoot!.getElementById('dashboardLink') as HTMLAnchorElement;
    const adminLink = el.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;

    expect(dashboardLink.classList.contains('nav-bar__section-link--active')).toBe(true);
    expect(adminLink.classList.contains('nav-bar__section-link--active')).toBe(false);
  });

  it('keeps the Admin section highlighted when navigating to Active Sessions from Admin', () => {
    window.location.hash = '#/admin/users';
    window.dispatchEvent(new Event('hashchange'));

    window.location.hash = '#/sessions';
    window.dispatchEvent(new Event('hashchange'));

    const dashboardLink = el.shadowRoot!.getElementById('dashboardLink') as HTMLAnchorElement;
    const adminLink = el.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;

    expect(dashboardLink.classList.contains('nav-bar__section-link--active')).toBe(false);
    expect(adminLink.classList.contains('nav-bar__section-link--active')).toBe(true);
  });

  it('shows the logged-in user email in the account chip', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const accountChip = el.shadowRoot!.getElementById('accountChip') as HTMLElement;
    const accountEmail = el.shadowRoot!.getElementById('accountEmail') as HTMLElement;

    expect(accountChip.hidden).toBe(false);
    expect(accountEmail.textContent).toBe('admin@panorama-music.com');
  });

  it('hides the Admin link for a non-admin user', () => {
    mockHasRole.mockReturnValue(false);
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const adminLink = el.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;
    expect(adminLink.hidden).toBe(true);
  });
});
