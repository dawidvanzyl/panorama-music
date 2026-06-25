import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
  beforeEach(async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';
    mockIsAuthenticated.mockReturnValue(false);
    mockGetRefreshToken.mockReturnValue('a-refresh-token');
    mockHasRole.mockReturnValue(false);
    window.location.hash = '#/';

    await import('../main');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
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
