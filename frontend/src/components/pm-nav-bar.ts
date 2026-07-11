import { isAuthenticated } from '../services/auth';
import { hasRole, getEmail } from '../services/token-storage';
import { updateActiveNavSection } from '../services/nav-section';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      flex-shrink: 0;
    }
    [hidden] {
      display: none !important;
    }
    nav {
      box-sizing: border-box;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      height: 60px;
      background: var(--pm-bg);
      border-bottom: 1px solid var(--pm-border);
    }
    .nav-bar__left {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .nav-bar__brand {
      font-weight: 700;
      font-size: 1.25rem;
      letter-spacing: -0.02em;
      color: var(--pm-text);
    }
    .nav-bar__sections {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .nav-bar__section-link {
      color: var(--pm-text-muted);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding-bottom: 2px;
      border-bottom: 2px solid transparent;
    }
    .nav-bar__section-link:hover {
      color: var(--pm-text);
    }
    .nav-bar__section-link--active {
      color: var(--pm-accent);
      border-bottom-color: var(--pm-accent);
    }
    .nav-bar__account {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
      font-size: 13px;
      font-weight: 600;
    }
    .nav-bar__account-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
      color: var(--pm-accent);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <nav>
    <div class="nav-bar__left">
      <span class="nav-bar__brand">Panorama Music</span>
      <div class="nav-bar__sections" id="sections" hidden>
        <a href="#/" class="nav-bar__section-link" id="dashboardLink">Dashboard</a>
        <a href="#/admin/users" class="nav-bar__section-link" id="adminLink" hidden>Admin</a>
      </div>
    </div>
    <span class="nav-bar__account" id="accountChip" hidden>
      <span class="nav-bar__account-icon">account_circle</span>
      <span id="accountEmail"></span>
    </span>
  </nav>
`;

export class PmNavBar extends HTMLElement {
  private sections: HTMLElement | null = null;
  private dashboardLink: HTMLAnchorElement | null = null;
  private adminLink: HTMLAnchorElement | null = null;
  private accountChip: HTMLElement | null = null;
  private accountEmail: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.sections = this.shadowRoot!.getElementById('sections') as HTMLElement;
    this.dashboardLink = this.shadowRoot!.getElementById('dashboardLink') as HTMLAnchorElement;
    this.adminLink = this.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;
    this.accountChip = this.shadowRoot!.getElementById('accountChip') as HTMLElement;
    this.accountEmail = this.shadowRoot!.getElementById('accountEmail') as HTMLElement;
    this.updateVisibility();
    window.addEventListener('hashchange', this.updateVisibility);
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.updateVisibility);
  }

  private updateVisibility = (): void => {
    const authed = isAuthenticated();
    const isAdmin = authed && hasRole('Admin');
    const basePath = window.location.hash.slice(1).split('?')[0];
    const activeSection = updateActiveNavSection(basePath);

    this.sections!.hidden = !authed;
    this.adminLink!.hidden = !isAdmin;

    this.dashboardLink!.classList.toggle('nav-bar__section-link--active', activeSection === 'dashboard');
    this.adminLink!.classList.toggle('nav-bar__section-link--active', activeSection === 'admin');

    this.accountChip!.hidden = !authed;
    this.accountEmail!.textContent = authed ? getEmail() : '';
  };
}

customElements.define('pm-nav-bar', PmNavBar);
