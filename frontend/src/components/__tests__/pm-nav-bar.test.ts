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
  getEmail: () => 'admin@panorama-music.com',
}));

/** Grants exactly the given roles to both role checks. */
function grantRoles(...roles: string[]): void {
  mockHasRole.mockImplementation((role: string) => roles.includes(role));
  mockHasAnyRole.mockImplementation((asked: string[]) => asked.some((role) => roles.includes(role)));
}

vi.mock('../../features/admin/services/admin', () => ({
  clearUsersCache: vi.fn(),
}));

import '../pm-nav-bar';

describe('pm-nav-bar — active section and account chip', { tags: ['M1.4UC12'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    grantRoles('Teacher', 'Coordinator', 'Admin');
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

  it('shows the logged-in user email in the account chip', () => {
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const accountChip = el.shadowRoot!.getElementById('accountChip') as HTMLElement;
    const accountEmail = el.shadowRoot!.getElementById('accountEmail') as HTMLElement;

    expect(accountChip.hidden).toBe(false);
    expect(accountEmail.textContent).toBe('admin@panorama-music.com');
  });

  it('hides the Admin link for a non-admin user', () => {
    grantRoles('Teacher');
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));

    const adminLink = el.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;
    expect(adminLink.hidden).toBe(true);
  });
});

describe('pm-nav-bar — Students entry point per role', { tags: ['214UC7'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-nav-bar');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function studentsLinkAfterRender(): HTMLAnchorElement {
    document.body.appendChild(el);
    window.location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));
    return el.shadowRoot!.getElementById('studentsLink') as HTMLAnchorElement;
  }

  it('points a Teacher at the student roster', () => {
    grantRoles('Teacher');

    const studentsLink = studentsLinkAfterRender();
    expect(studentsLink.hidden).toBe(false);
    expect(studentsLink.getAttribute('href')).toBe('#/students');
  });

  // A Coordinator who is not also a Teacher cannot open the roster, so the
  // Students entry point takes them to the screen they can actually maintain.
  it('points a Coordinator who is not a Teacher at the relationship screen', () => {
    grantRoles('Coordinator');

    const studentsLink = studentsLinkAfterRender();
    expect(studentsLink.hidden).toBe(false);
    expect(studentsLink.getAttribute('href')).toBe('#/students/guardian-relationships');
  });

  it('hides the Students link from a user with none of those roles', () => {
    grantRoles();

    expect(studentsLinkAfterRender().hidden).toBe(true);
  });
});
