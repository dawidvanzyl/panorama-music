import './styles/global.css';
import './components/pm-nav-bar';
import './components/pm-sidebar';
import './components/pm-app-footer';
import './components/pm-logout-menu';
import './components/pm-password-strength-indicator';
import './features/authentication/pages/pm-login-page';
import './features/authentication/pages/pm-registration-page';
import './features/admin/pages/pm-admin-users-page';
import './features/authentication/pages/pm-forgot-password-page';
import './features/authentication/pages/pm-reset-password-page';
import './features/sessions/pages/pm-admin-sessions-page';
import './features/sessions/components/pm-own-sessions-menu';
import './features/admin/pages/pm-admin-activity-log-page';
import './features/students/pages/pm-students-page';
import './features/students/pages/pm-guardian-relationships-page';
import './features/courses/pages/pm-course-management-page';
import './features/extra-curriculars/pages/pm-extra-curriculars-page';
import './features/teachers/pages/pm-teachers-page';
import './features/teachers/pages/pm-teacher-detail-page';
import './features/teachers/components/pm-my-details-menu';
import { isAuthenticated, tryRefresh } from './services/auth';
import { hasRole, hasAnyRole } from './services/token-storage';
import { resolveLandingPath } from './services/nav-entries';

// These guards are the enforcement point, and `NAV_ENTRIES` only decides what
// is offered — so a path's guard here must stay no stricter than the roles the
// matching entry is offered to, or `/` would resolve to a screen the guard
// refuses and bounce straight back.
const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);
const ADMIN_ONLY_PATHS = new Set(['/admin/users', '/admin/sessions', '/admin/activity-log']);
const TEACHER_OR_ADMIN_PATHS = new Set(['/students']);
const COORDINATOR_OR_ADMIN_PATHS = new Set(['/students/guardian-relationships']);
// Open to every staff role — the screen itself is what narrows down to what a
// non-maintainer may see, exactly as the endpoints do.
const STAFF_PATHS = new Set(['/courses']);
// Narrower than STAFF_PATHS: extra-curriculars are a Coordinator-owned area and
// the Admin role has no rights in it at all, so a user whose only role is Admin
// is bounced from the route as well as offered no entry.
const TEACHER_OR_COORDINATOR_PATHS = new Set(['/extra-curriculars']);
const REFRESH_RETRY_DELAY_MS = 3000;

function isCoordinatorOrAdminOnlyPath(basePath: string): boolean {
  return COORDINATOR_OR_ADMIN_PATHS.has(basePath) || basePath === '/teachers' || basePath.startsWith('/teachers/');
}

const ROUTES: Record<string, () => string> = {
  '/login': () => '<pm-login-page></pm-login-page>',
  '/register': () => '<pm-registration-page></pm-registration-page>',
  '/forgot-password': () => '<pm-forgot-password-page></pm-forgot-password-page>',
  '/reset-password': () => '<pm-reset-password-page></pm-reset-password-page>',
  '/admin/users': () => '<pm-admin-users-page></pm-admin-users-page>',
  '/admin/sessions': () => '<pm-admin-sessions-page></pm-admin-sessions-page>',
  '/admin/activity-log': () => '<pm-admin-activity-log-page></pm-admin-activity-log-page>',
  '/students': () => '<pm-students-page></pm-students-page>',
  '/students/guardian-relationships': () => '<pm-guardian-relationships-page></pm-guardian-relationships-page>',
  '/courses': () => '<pm-course-management-page></pm-course-management-page>',
  '/extra-curriculars': () => '<pm-extra-curriculars-page></pm-extra-curriculars-page>',
  '/teachers': () => '<pm-teachers-page></pm-teachers-page>',
  // `/` renders nothing of its own — it is resolved to a landing screen below
  // before any route lookup happens.
  '/': () => '',
};

const TEACHER_DETAIL_PATTERN = /^\/teachers\/([^/]+)$/;

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

  // `/` is a pure redirector to the topmost sidebar entry the signed-in user's
  // roles permit, which is also where a guard's refusal below ends up. Every
  // user holds at least Teacher, so an unresolved landing path is unreachable;
  // falling through to an empty shell is only there to rule out a loop.
  if (basePath === '/') {
    const landingPath = resolveLandingPath();
    if (landingPath !== null) {
      window.location.hash = '#' + landingPath;
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

  if (STAFF_PATHS.has(basePath) && !hasAnyRole(['Teacher', 'Coordinator', 'Admin'])) {
    window.location.hash = '#/';
    return;
  }

  if (TEACHER_OR_COORDINATOR_PATHS.has(basePath) && !hasAnyRole(['Teacher', 'Coordinator'])) {
    window.location.hash = '#/';
    return;
  }

  if (isCoordinatorOrAdminOnlyPath(basePath) && !hasAnyRole(['Coordinator', 'Admin'])) {
    window.location.hash = '#/';
    return;
  }

  const teacherDetailMatch = TEACHER_DETAIL_PATTERN.exec(basePath);
  const route = teacherDetailMatch
    ? () => {
        const el = document.createElement('pm-teacher-detail-page');
        el.setAttribute('teacher-id', decodeURIComponent(teacherDetailMatch[1]));
        return el.outerHTML;
      }
    : Object.hasOwn(ROUTES, basePath)
      ? ROUTES[basePath]
      : () => '<pm-login-page></pm-login-page>';
  app.innerHTML = isPublicPage
    ? '<main>' + route() + '</main>'
    : // The account menu is composed into the nav bar's slot from here: the shell
      // knows which features contribute an entry, and the shared nav bar stays
      // free of any one feature's screens.
      '<div class="pm-app-shell"><pm-nav-bar>' +
      '<pm-my-details-menu slot="account-menu"></pm-my-details-menu>' +
      '<pm-own-sessions-menu slot="account-menu"></pm-own-sessions-menu>' +
      '<pm-logout-menu slot="account-menu"></pm-logout-menu>' +
      '</pm-nav-bar><div class="pm-shell"><pm-sidebar></pm-sidebar><main>' +
      route() +
      '</main></div><pm-app-footer></pm-app-footer></div>';
}

window.addEventListener('hashchange', () => void render());
void render();
