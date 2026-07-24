import './styles/global.css';
import './components/pm-nav-bar';
import './components/pm-sidebar';
import './components/pm-app-footer';
import './components/pm-password-strength-indicator';
import './features/authentication/pages/pm-login-page';
import './features/authentication/pages/pm-registration-page';
import './features/admin/pages/pm-admin-users-page';
import './features/authentication/pages/pm-forgot-password-page';
import './features/authentication/pages/pm-reset-password-page';
import './features/sessions/pages/pm-sessions-page';
import './features/sessions/pages/pm-admin-sessions-page';
import './features/admin/pages/pm-admin-activity-log-page';
import './features/students/pages/pm-students-page';
import { isAuthenticated, tryRefresh } from './services/auth';
import { hasRole, hasAnyRole } from './services/token-storage';

const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);
const ADMIN_ONLY_PATHS = new Set(['/admin/users', '/admin/sessions', '/admin/activity-log']);
const TEACHER_OR_ADMIN_PATHS = new Set(['/students']);
const REFRESH_RETRY_DELAY_MS = 3000;

const ROUTES: Record<string, () => string> = {
  '/login': () => '<pm-login-page></pm-login-page>',
  '/register': () => '<pm-registration-page></pm-registration-page>',
  '/forgot-password': () => '<pm-forgot-password-page></pm-forgot-password-page>',
  '/reset-password': () => '<pm-reset-password-page></pm-reset-password-page>',
  '/admin/users': () => '<pm-admin-users-page></pm-admin-users-page>',
  '/admin/sessions': () => '<pm-admin-sessions-page></pm-admin-sessions-page>',
  '/admin/activity-log': () => '<pm-admin-activity-log-page></pm-admin-activity-log-page>',
  '/sessions': () => '<pm-sessions-page></pm-sessions-page>',
  '/students': () => '<pm-students-page></pm-students-page>',
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
    // The refresh token now lives in an HttpOnly cookie, so the frontend can't
    // check for its presence before asking the server — always attempt refresh
    // and let the response (401 if no/invalid cookie) decide.
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

  if (ADMIN_ONLY_PATHS.has(basePath) && !hasRole('Admin')) {
    window.location.hash = '#/';
    return;
  }

  if (TEACHER_OR_ADMIN_PATHS.has(basePath) && !hasAnyRole(['Teacher', 'Admin'])) {
    window.location.hash = '#/';
    return;
  }

  const route = Object.hasOwn(ROUTES, basePath) ? ROUTES[basePath] : () => '<pm-login-page></pm-login-page>';
  app.innerHTML = isPublicPage
    ? '<main>' + route() + '</main>'
    : '<div class="pm-app-shell"><pm-nav-bar></pm-nav-bar><div class="pm-shell"><pm-sidebar></pm-sidebar><main>' +
      route() +
      '</main></div><pm-app-footer></pm-app-footer></div>';
}

window.addEventListener('hashchange', () => void render());
void render();
