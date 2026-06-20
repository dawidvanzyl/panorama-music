import { isAuthenticated, logout } from '../services/auth';
import { hasRole } from '../services/token-storage';
import { clearUsersCache } from '../features/admin/services/admin';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      height: 60px;
      background: var(--pm-surface);
      border-bottom: 1px solid var(--pm-border);
    }
    .nav-bar__brand {
      font-weight: 700;
      font-size: 1.25rem;
      letter-spacing: -0.02em;
      color: var(--pm-text);
    }
    .nav-bar__btn {
      padding: 8px 18px;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      background: var(--pm-surface-2);
      color: var(--pm-text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .nav-bar__btn:hover {
      background: var(--pm-border);
    }
    .nav-bar__links {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav-bar__link {
      color: var(--pm-text-muted);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }
    .nav-bar__link:hover {
      color: var(--pm-text);
    }
  </style>
  <nav>
    <span class="nav-bar__brand">Panorama Music</span>
    <div class="nav-bar__links">
      <a href="#/admin/users" class="nav-bar__link" id="adminLink" hidden>Admin</a>
      <button id="logoutBtn" class="nav-bar__btn" hidden>Sign Out</button>
    </div>
  </nav>
`;

export class PmNavBar extends HTMLElement {
  private logoutBtn: HTMLButtonElement | null = null;
  private adminLink: HTMLAnchorElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.logoutBtn = this.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement;
    this.adminLink = this.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;
    this.logoutBtn!.addEventListener('click', this.handleLogout);
    this.updateVisibility();
    window.addEventListener('hashchange', this.updateVisibility);
  }

  disconnectedCallback(): void {
    this.logoutBtn?.removeEventListener('click', this.handleLogout);
    window.removeEventListener('hashchange', this.updateVisibility);
  }

  private updateVisibility = (): void => {
    this.logoutBtn!.hidden = !isAuthenticated();
    this.adminLink!.hidden = !isAuthenticated() || !hasRole('Admin');
  };

  private handleLogout = async (): Promise<void> => {
    clearUsersCache();
    await logout();
    this.updateVisibility();
    window.location.hash = '#/login';
  };
}

customElements.define('pm-nav-bar', PmNavBar);
