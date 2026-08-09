import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockIsAuthenticated = vi.fn();
vi.mock('../../services/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  logout: vi.fn(),
}));

// Both stubs receive the roles they were asked about, so a test can grant a
// specific role set (e.g. Coordinator but not Teacher) rather than a single
// blanket boolean.
const mockHasRole = vi.fn();
const mockHasAnyRole = vi.fn();
vi.mock('../../services/token-storage', () => ({
  hasRole: (role: string) => mockHasRole(role),
  hasAnyRole: (roles: string[]) => mockHasAnyRole(roles),
}));

/** Grants exactly the given roles to both role checks. */
function grantRoles(...roles: string[]): void {
  mockHasRole.mockImplementation((role: string) => roles.includes(role));
  mockHasAnyRole.mockImplementation((asked: string[]) => asked.some((role) => roles.includes(role)));
}

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
    grantRoles('Teacher', 'Coordinator', 'Admin');
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
    grantRoles('Teacher');
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
    grantRoles();
    window.location.hash = '#/students';
    window.dispatchEvent(new Event('hashchange'));

    const studentManagementLink = el.shadowRoot!.getElementById('studentManagementLink') as HTMLAnchorElement;
    expect(studentManagementLink.hidden).toBe(true);
  });
});

describe('pm-sidebar — Guardian Relationships link gated by role', { tags: ['214UC7'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function relationshipsLinkOn(hash: string): HTMLAnchorElement {
    document.body.appendChild(el);
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
    return el.shadowRoot!.getElementById('guardianRelationshipsLink') as HTMLAnchorElement;
  }

  it('shows the link inside the Students section for a Coordinator who is not a Teacher', () => {
    grantRoles('Coordinator');

    expect(relationshipsLinkOn('#/students/guardian-relationships').hidden).toBe(false);
  });

  it('marks the link active on its own route', () => {
    grantRoles('Coordinator');

    const link = relationshipsLinkOn('#/students/guardian-relationships');
    expect(link.classList.contains('sidebar__link--active')).toBe(true);
  });

  it('hides the link from a Teacher who is neither Coordinator nor Admin', () => {
    grantRoles('Teacher');

    expect(relationshipsLinkOn('#/students').hidden).toBe(true);
  });

  it('hides the link outside the Students section, even for an Admin', () => {
    grantRoles('Admin');

    expect(relationshipsLinkOn('#/').hidden).toBe(true);
  });
});

describe('pm-sidebar — Teacher Management link gated by role and section', { tags: ['231UC10'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function teachersLinkOn(hash: string): HTMLAnchorElement {
    document.body.appendChild(el);
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
    return el.shadowRoot!.getElementById('teachersLink') as HTMLAnchorElement;
  }

  it('shows the link inside the Students section for a Coordinator', () => {
    grantRoles('Coordinator');

    expect(teachersLinkOn('#/students').hidden).toBe(false);
  });

  it('shows the link inside the Students section for an Admin', () => {
    grantRoles('Admin');

    expect(teachersLinkOn('#/students').hidden).toBe(false);
  });

  it('hides the link while on the Dashboard section, even for an Admin', () => {
    grantRoles('Admin');

    expect(teachersLinkOn('#/').hidden).toBe(true);
  });

  it('hides the link from a Teacher who is neither Coordinator nor Admin', () => {
    grantRoles('Teacher');

    expect(teachersLinkOn('#/students').hidden).toBe(true);
  });

  // A /teachers route maps to the Students section, so navigating straight to
  // it must keep the link visible rather than hiding the entry point the user
  // just used.
  it('stays visible and marks itself active while on a /teachers route', () => {
    grantRoles('Admin');

    const link = teachersLinkOn('#/teachers');
    expect(link.hidden).toBe(false);
    expect(link.classList.contains('sidebar__link--active')).toBe(true);
  });
});
