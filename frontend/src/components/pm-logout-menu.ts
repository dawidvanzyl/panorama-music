import { logout } from '../services/auth';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([hidden]) {
      display: none !important;
    }
    .logout-menu__item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: var(--pm-radius);
      background: transparent;
      color: var(--pm-danger, #e05252);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }
    .logout-menu__item:hover {
      background: rgba(224, 82, 82, 0.1);
    }
    .logout-menu__item-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <button type="button" class="logout-menu__item" id="logoutBtn" role="menuitem">
    <span class="logout-menu__item-icon" aria-hidden="true">logout</span>Logout
  </button>
`;

/**
 * The account menu's sign-out action. Ending a session is not a navigation
 * concern, which is why this no longer sits in the sidebar.
 *
 * It clears nothing itself: `logout()` reaches `clearTokens()`, which empties
 * every cache registered with the session-cache registry. That covers the paths
 * this button is not on either — an expired refresh token, a 401 on any call —
 * so clearing here as well would only be a second, partial copy of it.
 */
export class PmLogoutMenu extends HTMLElement {
  private logoutBtn: HTMLButtonElement | null = null;
  private logoutPending = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.logoutBtn = this.shadowRoot!.getElementById('logoutBtn') as HTMLButtonElement;
    this.logoutBtn.addEventListener('click', this.handleLogout);
  }

  disconnectedCallback(): void {
    this.logoutBtn?.removeEventListener('click', this.handleLogout);
  }

  // `logout()` rethrows a failed request after its `finally { clearTokens() }`,
  // so the session is over either way and the login screen is where the user
  // belongs on both paths. The in-flight guard keeps a double-click from
  // issuing a second POST /logout.
  private handleLogout = async (): Promise<void> => {
    if (this.logoutPending) return;
    this.logoutPending = true;
    this.logoutBtn!.disabled = true;
    try {
      await logout();
    } catch {
      // Swallowed deliberately: the tokens are already gone, so there is
      // nothing to retry and nothing useful to say on the way out.
    } finally {
      window.location.hash = '#/login';
      this.logoutPending = false;
      this.logoutBtn!.disabled = false;
    }
  };
}

customElements.define('pm-logout-menu', PmLogoutMenu);
