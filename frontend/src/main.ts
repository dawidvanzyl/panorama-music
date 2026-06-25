import './styles/global.css';
import './components/pm-nav-bar';
import './components/pm-password-strength-indicator';
import './features/authentication/pages/pm-login-page';
import './features/authentication/pages/pm-registration-page';
import './features/admin/pages/pm-admin-users-page';
import './features/authentication/pages/pm-forgot-password-page';
import './features/authentication/pages/pm-reset-password-page';
import { isAuthenticated, tryRefresh } from './services/auth';
import { getRefreshToken, hasRole } from './services/token-storage';

const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);
const REFRESH_RETRY_DELAY_MS = 3000;

const ROUTES: Record<string, () => string> = {
  '/login': () => '<pm-login-page></pm-login-page>',
  '/register': () => '<pm-registration-page></pm-registration-page>',
  '/forgot-password': () => '<pm-forgot-password-page></pm-forgot-password-page>',
  '/reset-password': () => '<pm-reset-password-page></pm-reset-password-page>',
  '/admin/users': () => '<pm-admin-users-page></pm-admin-users-page>',
  '/': () => '<h1>Welcome to Panorama Music</h1><p>Dashboard coming soon.</p>',
};

let retryTimer: ReturnType<typeof window.setTimeout> | null = null;

async function render(): Promise<void> {
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }

  const app = document.getElementById('app');
  if (!app) return;

  const hash = window.location.hash.slice(1) || '/';
  const basePath = hash.split('?')[0];
  const isPublicPage = PUBLIC_PATHS.has(basePath);

  if (!isPublicPage && !isAuthenticated()) {
    if (getRefreshToken() === null) {
      window.location.hash = '#/login';
      return;
    }
    const outcome = await tryRefresh();
    if (outcome === 'rejected') {
      window.location.hash = '#/login';
      return;
    }
    if (outcome === 'failed') {
      app.innerHTML = '<p>Unable to verify your session. Retrying…</p>';
      retryTimer = window.setTimeout(() => void render(), REFRESH_RETRY_DELAY_MS);
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

window.addEventListener('hashchange', () => void render());
void render();
