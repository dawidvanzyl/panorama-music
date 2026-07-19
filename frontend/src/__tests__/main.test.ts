import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

const mockIsAuthenticated = vi.fn();
const mockTryRefresh = vi.fn();
vi.mock('../services/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  tryRefresh: () => mockTryRefresh(),
}));

const mockHasRole = vi.fn();
vi.mock('../services/token-storage', () => ({
  hasRole: () => mockHasRole(),
  hasAnyRole: () => mockHasRole(),
  getEmail: () => 'test@example.com',
}));

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
    mockHasRole.mockReturnValue(false);
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

  it('renders the sidebar alongside the nav bar on the dashboard route', async () => {
    mockHasRole.mockReturnValue(false);
    window.location.hash = '#/';

    await vi.waitFor(() => {
      const app = document.getElementById('app')!;
      expect(app.innerHTML).toContain('<pm-nav-bar>');
      expect(app.innerHTML).toContain('<pm-sidebar>');
    });
  });

  it('renders the sidebar alongside the nav bar on the pre-existing admin users route', async () => {
    mockHasRole.mockReturnValue(true);
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

  it('redirects a non-admin navigating directly to the Activity Log route to / and renders no audit data', async () => {
    mockHasRole.mockReturnValue(false);
    window.location.hash = '#/admin/activity-log';

    await vi.waitFor(() => {
      expect(window.location.hash).toBe('#/');
    });

    const app = document.getElementById('app')!;
    expect(app.innerHTML).not.toContain('<pm-admin-activity-log-page>');
  });

  it('allows an admin to reach the Activity Log route', async () => {
    mockHasRole.mockReturnValue(true);
    window.location.hash = '#/admin/activity-log';

    await vi.waitFor(() => {
      const app = document.getElementById('app')!;
      expect(app.innerHTML).toContain('<pm-admin-activity-log-page>');
    });
  });
});
