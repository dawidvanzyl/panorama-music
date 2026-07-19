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
}));

vi.mock('../../features/admin/services/admin', () => ({
  clearUsersCache: vi.fn(),
}));

vi.mock('../../features/students/services/students', () => ({
  clearStudentsCache: vi.fn(),
}));

import '../pm-sidebar';

describe('pm-sidebar — admin links gated by active section', { tags: ['M1.4UC12'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    mockHasRole.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('hides User Management / User Sessions while on the Dashboard section, even for an admin', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const userManagementLink = el.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    const adminSessionsLink = el.shadowRoot!.getElementById('adminSessionsLink') as HTMLAnchorElement;

    expect(userManagementLink.hidden).toBe(true);
    expect(adminSessionsLink.hidden).toBe(true);
  });

  it('shows User Management / User Sessions once inside the Admin section for an admin', () => {
    window.location.hash = '#/admin/users';
    window.dispatchEvent(new Event('hashchange'));

    const userManagementLink = el.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    const adminSessionsLink = el.shadowRoot!.getElementById('adminSessionsLink') as HTMLAnchorElement;

    expect(userManagementLink.hidden).toBe(false);
    expect(adminSessionsLink.hidden).toBe(false);
  });

  it('keeps User Management / User Sessions visible when navigating to Active Sessions from the Admin section', () => {
    window.location.hash = '#/admin/users';
    window.dispatchEvent(new Event('hashchange'));

    window.location.hash = '#/sessions';
    window.dispatchEvent(new Event('hashchange'));

    const userManagementLink = el.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    const adminSessionsLink = el.shadowRoot!.getElementById('adminSessionsLink') as HTMLAnchorElement;

    expect(userManagementLink.hidden).toBe(false);
    expect(adminSessionsLink.hidden).toBe(false);
  });

  it('keeps User Management / User Sessions hidden when navigating to Active Sessions from Dashboard', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    window.location.hash = '#/sessions';
    window.dispatchEvent(new Event('hashchange'));

    const userManagementLink = el.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    const adminSessionsLink = el.shadowRoot!.getElementById('adminSessionsLink') as HTMLAnchorElement;

    expect(userManagementLink.hidden).toBe(true);
    expect(adminSessionsLink.hidden).toBe(true);
  });

  it('always shows Active Sessions and Logout regardless of section', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const sessionsLink = el.shadowRoot!.getElementById('sessionsLink') as HTMLAnchorElement;
    const logoutBtn = el.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement;

    expect(sessionsLink.hidden).toBe(false);
    expect(logoutBtn.hidden).toBe(false);

    window.location.hash = '#/admin/users';
    window.dispatchEvent(new Event('hashchange'));

    expect(sessionsLink.hidden).toBe(false);
    expect(logoutBtn.hidden).toBe(false);
  });

  it('never shows admin links for a non-admin even inside an /admin route', () => {
    mockHasRole.mockReturnValue(false);
    window.location.hash = '#/admin/users';
    window.dispatchEvent(new Event('hashchange'));

    const userManagementLink = el.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    expect(userManagementLink.hidden).toBe(true);
  });

  it('marks the current route link as active and clears the others', () => {
    window.location.hash = '#/admin/users';
    window.dispatchEvent(new Event('hashchange'));

    const userManagementLink = el.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    const adminSessionsLink = el.shadowRoot!.getElementById('adminSessionsLink') as HTMLAnchorElement;
    const sessionsLink = el.shadowRoot!.getElementById('sessionsLink') as HTMLAnchorElement;

    expect(userManagementLink.classList.contains('sidebar__link--active')).toBe(true);
    expect(adminSessionsLink.classList.contains('sidebar__link--active')).toBe(false);
    expect(sessionsLink.classList.contains('sidebar__link--active')).toBe(false);

    window.location.hash = '#/sessions';
    window.dispatchEvent(new Event('hashchange'));

    expect(userManagementLink.classList.contains('sidebar__link--active')).toBe(false);
    expect(sessionsLink.classList.contains('sidebar__link--active')).toBe(true);
  });

  it('hides Student Management while on the Dashboard section, even for a teacher or admin', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const studentManagementLink = el.shadowRoot!.getElementById('studentManagementLink') as HTMLAnchorElement;
    expect(studentManagementLink.hidden).toBe(true);
  });

  it('shows Student Management once inside the Students section for a teacher or admin', () => {
    window.location.hash = '#/students';
    window.dispatchEvent(new Event('hashchange'));

    const studentManagementLink = el.shadowRoot!.getElementById('studentManagementLink') as HTMLAnchorElement;
    expect(studentManagementLink.hidden).toBe(false);
    expect(studentManagementLink.classList.contains('sidebar__link--active')).toBe(true);
  });

  it('never shows Student Management for a user without Teacher or Admin, even inside the Students section', () => {
    mockHasRole.mockReturnValue(false);
    window.location.hash = '#/students';
    window.dispatchEvent(new Event('hashchange'));

    const studentManagementLink = el.shadowRoot!.getElementById('studentManagementLink') as HTMLAnchorElement;
    expect(studentManagementLink.hidden).toBe(true);
  });
});
