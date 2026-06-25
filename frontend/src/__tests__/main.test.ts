import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

const mockIsAuthenticated = vi.fn();
const mockTryRefresh = vi.fn();
vi.mock('../services/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  tryRefresh: () => mockTryRefresh(),
}));

const mockGetRefreshToken = vi.fn();
const mockHasRole = vi.fn();
vi.mock('../services/token-storage', () => ({
  getRefreshToken: () => mockGetRefreshToken(),
  hasRole: () => mockHasRole(),
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
    mockGetRefreshToken.mockReturnValue('a-refresh-token');
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
