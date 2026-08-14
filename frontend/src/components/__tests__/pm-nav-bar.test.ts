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

describe('pm-nav-bar — brand and account chip only', { tags: ['239UC3'] }, () => {
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

  it('shows the logged-in user email in the account chip', () => {
    window.location.hash = '#/students';
    window.dispatchEvent(new Event('hashchange'));

    const accountChip = el.shadowRoot!.getElementById('accountChip') as HTMLElement;
    const accountEmail = el.shadowRoot!.getElementById('accountEmail') as HTMLElement;

    expect(accountChip.hidden).toBe(false);
    expect(accountEmail.textContent).toBe('admin@panorama-music.com');
  });

  it('keeps the brand', () => {
    expect(el.shadowRoot!.querySelector('.nav-bar__brand')!.textContent).toBe('Panorama Music');
  });

  it.each(['#/students', '#/teachers', '#/admin/users'])(
    'exposes no navigation link at all on %s, for a user holding every role',
    (hash) => {
      window.location.hash = hash;
      window.dispatchEvent(new Event('hashchange'));

      expect(el.shadowRoot!.querySelectorAll('a')).toHaveLength(0);
      expect(el.shadowRoot!.getElementById('sections')).toBeNull();
      expect(el.shadowRoot!.textContent).not.toContain('Dashboard');
    },
  );
});
