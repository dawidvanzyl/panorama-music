import './styles/global.css';
import './components/pm-nav-bar';
import './pages/pm-login-page';
import './pages/pm-registration-page';
import './pages/pm-admin-users-page';
import { isAuthenticated } from './services/auth';
import { hasRole } from './services/token-storage';

const PUBLIC_PATHS = new Set(['/login', '/register']);

const ROUTES: Record<string, () => string> = {
  '/login': () => '<pm-login-page></pm-login-page>',
  '/register': () => '<pm-registration-page></pm-registration-page>',
  '/admin/users': () => '<pm-admin-users-page></pm-admin-users-page>',
  '/': () => '<h1>Welcome to Panorama Music</h1><p>Dashboard coming soon.</p>',
};

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const hash = window.location.hash.slice(1) || '/';
  const basePath = hash.split('?')[0];
  const isPublicPage = PUBLIC_PATHS.has(basePath);

  if (!isPublicPage && !isAuthenticated()) {
    window.location.hash = '#/login';
    return;
  }

  if (basePath === '/admin/users' && !hasRole('Admin')) {
    window.location.hash = '#/';
    return;
  }

  const route = ROUTES[basePath] ?? (() => '<pm-login-page></pm-login-page>');
  app.innerHTML = (isPublicPage ? '' : '<pm-nav-bar></pm-nav-bar>') + '<main>' + route() + '</main>';
}

window.addEventListener('hashchange', render);
render();
