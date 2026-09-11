import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

const mockIsAuthenticated = vi.fn();
const mockTryRefresh = vi.fn();
vi.mock('../services/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  tryRefresh: () => mockTryRefresh(),
}));

// Both stubs receive the roles they were asked about, so a test can grant a
// specific role set (e.g. Coordinator but not Admin) rather than a single
// blanket boolean — which matters now that where `/` lands depends on which
// entries a user's roles permit.
const mockHasRole = vi.fn();
const mockHasAnyRole = vi.fn();
vi.mock('../services/token-storage', () => ({
  hasRole: (role: string) => mockHasRole(role),
  hasAnyRole: (roles: string[]) => mockHasAnyRole(roles),
  getEmail: () => 'test@example.com',
}));

/** Grants exactly the given roles to both role checks. */
function grantRoles(...roles: string[]): void {
  mockHasRole.mockImplementation((role: string) => roles.includes(role));
  mockHasAnyRole.mockImplementation((asked: string[]) => asked.some((role) => roles.includes(role)));
}

describe('main router — refresh-failure retry handling', { tags: ['M1.2UC2'] }, () => {
  // main.ts pulls in component modules that call customElements.define() at
  // module scope, so it can only be imported once per test run — re-importing
  // it (e.g. via vi.resetModules()) throws "already registered in the
  // registry". Loaded once here; every other piece of state (mocks, DOM,
  // hash) is reset per test in beforeEach below instead.
  beforeAll(async () => {
    await import('../main');
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(false);
    grantRoles();
    // A public page as the neutral baseline: it skips the refresh-check
    // block entirely, so navigating to it can never trigger a stray
    // tryRefresh() call carrying over leftover mock state from a prior test.
    window.location.hash = '#/login';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a retry message and re-attempts the refresh after a delay when it fails unexpectedly', async () => {
    mockTryRefresh.mockResolvedValue('failed');
    window.location.hash = '#/protected-route';

    await vi.waitFor(() => {
      expect(document.getElementById('app')!.innerHTML).toContain('Unable to verify your session');
    });

    mockTryRefresh.mockClear();
    await vi.advanceTimersByTimeAsync(3000);

    expect(mockTryRefresh).toHaveBeenCalled();
  });

  it('does not stack multiple pending retry timers when render runs again before the first one fires', async () => {
    mockTryRefresh.mockResolvedValue('failed');
    window.location.hash = '#/protected-route';

    await vi.waitFor(() => {
      expect(document.getElementById('app')!.innerHTML).toContain('Unable to verify your session');
    });

    // Something else triggers another render before the first retry timer
    // fires (e.g. the user navigating again while still unauthenticated).
    mockTryRefresh.mockClear();
    window.dispatchEvent(new Event('hashchange'));

    await vi.waitFor(() => {
      expect(mockTryRefresh).toHaveBeenCalledTimes(1);
    });

    // If the first render's timer wasn't cancelled, both it and the second
    // render's timer would fire here, calling tryRefresh twice instead of
    // once.
    mockTryRefresh.mockClear();
    await vi.advanceTimersByTimeAsync(3000);

    expect(mockTryRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('main router — persistent sidebar', { tags: ['M1.4UC12'] }, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(true);
  });

  it('renders the sidebar alongside the nav bar on the students route', async () => {
    grantRoles('Teacher');
    window.location.hash = '#/students';

    await vi.waitFor(() => {
      const app = document.getElementById('app')!;
      expect(app.innerHTML).toContain('<pm-nav-bar>');
      expect(app.innerHTML).toContain('<pm-sidebar>');
    });
  });

  it('renders the sidebar alongside the nav bar on the pre-existing admin users route', async () => {
    grantRoles('Admin');
    window.location.hash = '#/admin/users';

    await vi.waitFor(() => {
      const app = document.getElementById('app')!;
      expect(app.innerHTML).toContain('<pm-nav-bar>');
      expect(app.innerHTML).toContain('<pm-sidebar>');
    });
  });
});

describe('main router — Activity Log admin guard', { tags: ['M1.5UC17'] }, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(true);
  });

  it('redirects a non-admin navigating directly to the Activity Log route away and renders no audit data', async () => {
    // A role is granted so the refusal has somewhere to resolve to: the guard
    // still bounces to `/`, which then lands on the user's topmost entry.
    grantRoles('Teacher');
    window.location.hash = '#/admin/activity-log';

    await vi.waitFor(() => {
      expect(window.location.hash).toBe('#/students');
    });

    const app = document.getElementById('app')!;
    expect(app.innerHTML).not.toContain('<pm-admin-activity-log-page>');
  });

  it('allows an admin to reach the Activity Log route', async () => {
    grantRoles('Admin');
    window.location.hash = '#/admin/activity-log';

    await vi.waitFor(() => {
      const app = document.getElementById('app')!;
      expect(app.innerHTML).toContain('<pm-admin-activity-log-page>');
    });
  });
});

describe('main router — `/` resolves to the topmost permitted entry', { tags: ['239UC6', '239UC7'] }, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(true);
  });

  it.each([
    { roles: ['Admin'], landing: '#/admin/users' },
    { roles: ['Teacher'], landing: '#/students' },
    { roles: ['Coordinator'], landing: '#/waiting-list' },
  ])('takes a $roles user arriving at / to $landing', async ({ roles, landing }) => {
    grantRoles(...roles);
    window.location.hash = '#/';

    await vi.waitFor(() => {
      expect(window.location.hash).toBe(landing);
    });
  });

  it('renders no Dashboard content at any point on the way there', async () => {
    grantRoles('Teacher');
    const app = document.getElementById('app')!;
    window.location.hash = '#/';

    await vi.waitFor(() => {
      expect(window.location.hash).toBe('#/students');
    });

    expect(app.innerHTML).not.toContain('Welcome to Panorama Music');
    expect(app.innerHTML).not.toContain('Dashboard');
  });
});

describe('main router — a refused route lands on the topmost permitted entry', { tags: ['239UC8'] }, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(true);
  });

  it.each([
    { roles: ['Teacher'], refused: '#/teachers', page: '<pm-teachers-page>', landing: '#/students' },
    {
      roles: ['Coordinator'],
      refused: '#/students',
      page: '<pm-students-page>',
      landing: '#/waiting-list',
    },
    {
      roles: ['Teacher'],
      refused: '#/admin/users',
      page: '<pm-admin-users-page>',
      landing: '#/students',
    },
    // Admin owns none of these three areas any longer — Students, Courses and
    // Guardian Relationships are Teacher/Coordinator-owned.
    {
      roles: ['Admin'],
      refused: '#/students',
      page: '<pm-students-page>',
      landing: '#/admin/users',
    },
    {
      roles: ['Admin'],
      refused: '#/courses',
      page: '<pm-course-management-page>',
      landing: '#/admin/users',
    },
    {
      roles: ['Admin'],
      refused: '#/students/guardian-relationships',
      page: '<pm-guardian-relationships-page>',
      landing: '#/admin/users',
    },
  ])('bounces a $roles user off $refused onto $landing', async ({ roles, refused, page, landing }) => {
    grantRoles(...roles);
    // A public page as the neutral baseline: without it, a case whose refused
    // route is where the previous case landed would set an unchanged hash and
    // no render would run at all.
    window.location.hash = '#/login';
    await vi.waitFor(() => {
      expect(document.getElementById('app')!.innerHTML).toContain('<pm-login-page>');
    });

    window.location.hash = refused;

    await vi.waitFor(() => {
      expect(window.location.hash).toBe(landing);
    });

    expect(document.getElementById('app')!.innerHTML).not.toContain(page);
  });
});

describe('main router — the Extra-Curriculars route is refused to Admin alone', { tags: ['275UC23'] }, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(true);
  });

  it('bounces a user whose only role is Admin off the route without rendering the page', async () => {
    grantRoles('Admin');
    window.location.hash = '#/extra-curriculars';

    await vi.waitFor(() => {
      expect(window.location.hash).toBe('#/admin/users');
    });

    expect(document.getElementById('app')!.innerHTML).not.toContain('<pm-extra-curriculars-page>');
  });

  it.each([['Teacher'], ['Coordinator']])('lets a %s reach the page', async (role) => {
    grantRoles(role);
    // A public page as the neutral baseline, so the hash below always changes
    // and a render actually runs.
    window.location.hash = '#/login';
    await vi.waitFor(() => {
      expect(document.getElementById('app')!.innerHTML).toContain('<pm-login-page>');
    });

    window.location.hash = '#/extra-curriculars';

    await vi.waitFor(() => {
      expect(document.getElementById('app')!.innerHTML).toContain('<pm-extra-curriculars-page>');
    });
  });
});

describe('main router — Teacher Management route guard', { tags: ['273UC4'] }, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(true);
  });

  it.each([['Coordinator'], ['BankingCoordinator']])('lets a %s reach /teachers', async (role) => {
    grantRoles(role);
    window.location.hash = '#/login';
    await vi.waitFor(() => {
      expect(document.getElementById('app')!.innerHTML).toContain('<pm-login-page>');
    });

    window.location.hash = '#/teachers';

    await vi.waitFor(() => {
      expect(document.getElementById('app')!.innerHTML).toContain('<pm-teachers-page>');
    });
  });

  it('bounces a BankingCoordinator off /students, which the role grants nothing in', async () => {
    grantRoles('BankingCoordinator');
    window.location.hash = '#/students';

    await vi.waitFor(() => {
      expect(window.location.hash).toBe('#/teachers');
    });

    expect(document.getElementById('app')!.innerHTML).not.toContain('<pm-students-page>');
  });
});
