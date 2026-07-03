import { isAuthenticated, logout } from '../services/auth';
import { hasRole } from '../services/token-storage';
import { clearUsersCache } from '../features/admin/services/admin';
import { updateActiveNavSection } from '../services/nav-section';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      width: 240px;
      flex-shrink: 0;
      height: 100%;
      background: var(--pm-surface);
      border-right: 1px solid var(--pm-border);
    }
    [hidden] {
      display: none !important;
    }
    nav {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      height: 100%;
    }
    .sidebar__links {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sidebar__bottom {
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-top: 1px solid var(--pm-border);
      padding-top: 12px;
      margin-top: auto;
    }
    .sidebar__link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--pm-radius);
      color: var(--pm-text-muted);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }
    .sidebar__link:hover,
    .sidebar__link--active {
      background: var(--pm-surface-2);
      color: var(--pm-text);
    }
    .sidebar__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
      flex-shrink: 0;
    }
    .sidebar__logout {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      text-align: left;
      padding: 10px 12px;
      border: none;
      border-radius: var(--pm-radius);
      background: transparent;
      color: var(--pm-danger, #e05252);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .sidebar__logout:hover {
      background: rgba(224, 82, 82, 0.1);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <nav>
    <div class="sidebar__links">
      <a href="#/admin/users" class="sidebar__link" id="userManagementLink" hidden>
        <span class="sidebar__icon">group</span>
        <span>User Management</span>
      </a>
      <a href="#/admin/sessions" class="sidebar__link" id="adminSessionsLink" hidden>
        <span class="sidebar__icon">history</span>
        <span>User Sessions</span>
      </a>
    </div>
    <div class="sidebar__bottom">
      <a href="#/sessions" class="sidebar__link" id="sessionsLink">
        <span class="sidebar__icon">manage_accounts</span>
        <span>Active Sessions</span>
      </a>
      <button type="button" class="sidebar__logout" id="logoutBtn">
        <span class="sidebar__icon">logout</span>
        <span>Logout</span>
      </button>
    </div>
  </nav>
`;

export class PmSidebar extends HTMLElement {
  private userManagementLink: HTMLAnchorElement | null = null;
  private adminSessionsLink: HTMLAnchorElement | null = null;
  private sessionsLink: HTMLAnchorElement | null = null;
  private logoutBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.userManagementLink = this.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    this.adminSessionsLink = this.shadowRoot!.getElementById('adminSessionsLink') as HTMLAnchorElement;
    this.sessionsLink = this.shadowRoot!.getElementById('sessionsLink') as HTMLAnchorElement;
    this.logoutBtn = this.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement;

    this.logoutBtn.addEventListener('click', this.handleLogout);
    this.updateVisibility();
    window.addEventListener('hashchange', this.updateVisibility);
  }

  disconnectedCallback(): void {
    this.logoutBtn?.removeEventListener('click', this.handleLogout);
    window.removeEventListener('hashchange', this.updateVisibility);
  }

  private updateVisibility = (): void => {
    const basePath = window.location.hash.slice(1).split('?')[0];
    const activeSection = updateActiveNavSection(basePath);

    const showAdminLinks = isAuthenticated() && hasRole('Admin') && activeSection === 'admin';
    this.userManagementLink!.hidden = !showAdminLinks;
    this.adminSessionsLink!.hidden = !showAdminLinks;

    this.userManagementLink!.classList.toggle('sidebar__link--active', basePath === '/admin/users');
    this.adminSessionsLink!.classList.toggle('sidebar__link--active', basePath === '/admin/sessions');
    this.sessionsLink!.classList.toggle('sidebar__link--active', basePath === '/sessions');
  };

  private handleLogout = async (): Promise<void> => {
    clearUsersCache();
    await logout();
    this.updateVisibility();
    window.location.hash = '#/login';
  };
}

customElements.define('pm-sidebar', PmSidebar);
