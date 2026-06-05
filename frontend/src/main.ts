import './styles/global.css';
import './components/pm-nav-bar';
import './pages/pm-login-page';
import './pages/pm-registration-page';
import { isAuthenticated } from './services/auth';

const ROUTES: Record<string, () => string> = {
  '/login': () => '<pm-login-page></pm-login-page>',
  '/register': () => '<pm-registration-page></pm-registration-page>',
  '/': () => {
    if (!isAuthenticated()) return '<pm-login-page></pm-login-page>';
    return '<h1>Welcome to Panorama Music</h1><p>Dashboard coming soon.</p>';
  },
};

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const hash = window.location.hash.slice(1) || '/';
  const basePath = hash.split('?')[0];
  const route = ROUTES[basePath] ?? (() => '<pm-login-page></pm-login-page>');

  app.innerHTML = '<pm-nav-bar></pm-nav-bar><main>' + route() + '</main>';
}

window.addEventListener('hashchange', render);
render();
