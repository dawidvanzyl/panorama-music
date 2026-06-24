import './styles/global.css';
import './components/pm-nav-bar';
import './components/pm-password-strength-indicator';
import './features/authentication/pages/pm-login-page';
import './features/authentication/pages/pm-registration-page';
import './features/admin/pages/pm-admin-users-page';
import './features/authentication/pages/pm-forgot-password-page';
import './features/authentication/pages/pm-reset-password-page';
import { AuthError, isAuthenticated, refreshToken } from './services/auth';
import { getRefreshToken, hasRole } from './services/token-storage';

const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

const ROUTES: Record<string, () => string> = {
  '/login': () => '<pm-login-page></pm-login-page>',
  '/register': () => '<pm-registration-page></pm-registration-page>',
  '/forgot-password': () => '<pm-forgot-password-page></pm-forgot-password-page>',
  '/reset-password': () => '<pm-reset-password-page></pm-reset-password-page>',
  '/admin/users': () => '<pm-admin-users-page></pm-admin-users-page>',
  '/': () => '<h1>Welcome to Panorama Music</h1><p>Dashboard coming soon.</p>',
};

async function render(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const hash = window.location.hash.slice(1) || '/';
  const basePath = hash.split('?')[0];
  const isPublicPage = PUBLIC_PATHS.has(basePath);

  if (!isPublicPage && !isAuthenticated()) {
    const canAttemptRefresh = getRefreshToken() !== null;
    const refreshed = canAttemptRefresh && (await tryRefresh());
    if (!refreshed) {
      window.location.hash = '#/login';
      return;
    }
  }

  if (basePath === '/admin/users' && !hasRole('Admin')) {
    window.location.hash = '#/';
    return;
  }

  const route = Object.hasOwn(ROUTES, basePath)
    ? ROUTES[basePath]
    : (() => '<pm-login-page></pm-login-page>');
  app.innerHTML = (isPublicPage ? '' : '<pm-nav-bar></pm-nav-bar>') + '<main>' + route() + '</main>';
}

let pendingRefresh: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  try {
    await refreshToken();
    return true;
  } catch (err) {
    if (!(err instanceof AuthError)) {
      console.error('Unexpected error refreshing session', err);
    }
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!pendingRefresh) {
    pendingRefresh = refreshOnce().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

window.addEventListener('hashchange', () => void render());
void render();
