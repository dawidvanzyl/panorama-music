import { isAuthenticated, logout } from '../services/auth';

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
  </style>
  <nav>
    <span class="nav-bar__brand">Panorama Music</span>
    <button id="logoutBtn" class="nav-bar__btn" hidden>Sign Out</button>
  </nav>
`;

export class PmNavBar extends HTMLElement {
  private logoutBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.logoutBtn = this.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement;
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
  };

  private handleLogout = async (): Promise<void> => {
    await logout();
    this.updateVisibility();
    window.location.hash = '#/login';
  };
}

customElements.define('pm-nav-bar', PmNavBar);
