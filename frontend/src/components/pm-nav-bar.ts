import { isAuthenticated, logout } from '../services/auth';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.5rem;
      background: #f5f5f5;
      border-bottom: 1px solid #ccc;
    }
    .nav-bar__brand {
      font-weight: bold;
      font-size: 1.125rem;
    }
    .nav-bar__btn {
      padding: 0.375rem 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .nav-bar__btn:hover {
      background: #eee;
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
