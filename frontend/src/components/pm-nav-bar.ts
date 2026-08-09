import { isAuthenticated } from '../services/auth';
import { hasRole, hasAnyRole, getEmail } from '../services/token-storage';
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
    /* The chip is the anchor the account menu hangs off, so the wrapper is the
       positioning context rather than the nav itself. */
    .nav-bar__account-area {
      position: relative;
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
      font-family: inherit;
    }
    .nav-bar__account--interactive {
      cursor: pointer;
    }
    .nav-bar__account-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
      color: var(--pm-accent);
    }
    .nav-bar__account-chevron {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 18px;
      color: var(--pm-text-muted);
    }
    .nav-bar__account-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 60;
      min-width: 220px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      box-shadow: var(--pm-shadow);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <nav>
    <div class="nav-bar__left">
      <span class="nav-bar__brand">Panorama Music</span>
      <div class="nav-bar__sections" id="sections" hidden>
        <a href="#/" class="nav-bar__section-link" id="dashboardLink">Dashboard</a>
        <a href="#/students" class="nav-bar__section-link" id="studentsLink" hidden>Students</a>
        <a href="#/admin/users" class="nav-bar__section-link" id="adminLink" hidden>Admin</a>
      </div>
    </div>
    <div class="nav-bar__account-area" id="accountArea">
      <button type="button" class="nav-bar__account" id="accountChip" hidden aria-haspopup="menu" aria-expanded="false">
        <span class="nav-bar__account-icon" aria-hidden="true">account_circle</span>
        <span id="accountEmail"></span>
        <span class="nav-bar__account-chevron" id="accountChevron" aria-hidden="true" hidden>expand_more</span>
      </button>
      <div class="nav-bar__account-menu" id="accountMenu" role="menu" hidden>
        <slot name="account-menu" id="accountMenuSlot"></slot>
      </div>
    </div>
  </nav>
`;

export class PmNavBar extends HTMLElement {
  private sections: HTMLElement | null = null;
  private dashboardLink: HTMLAnchorElement | null = null;
  private studentsLink: HTMLAnchorElement | null = null;
  private adminLink: HTMLAnchorElement | null = null;
  private accountChip: HTMLButtonElement | null = null;
  private accountEmail: HTMLElement | null = null;
  private accountChevron: HTMLElement | null = null;
  private accountMenu: HTMLElement | null = null;
  private accountMenuSlot: HTMLSlotElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.sections = this.shadowRoot!.getElementById('sections') as HTMLElement;
    this.dashboardLink = this.shadowRoot!.getElementById('dashboardLink') as HTMLAnchorElement;
    this.studentsLink = this.shadowRoot!.getElementById('studentsLink') as HTMLAnchorElement;
    this.adminLink = this.shadowRoot!.getElementById('adminLink') as HTMLAnchorElement;
    this.accountChip = this.shadowRoot!.getElementById('accountChip') as HTMLButtonElement;
    this.accountEmail = this.shadowRoot!.getElementById('accountEmail') as HTMLElement;
    this.accountChevron = this.shadowRoot!.getElementById('accountChevron') as HTMLElement;
    this.accountMenu = this.shadowRoot!.getElementById('accountMenu') as HTMLElement;
    this.accountMenuSlot = this.shadowRoot!.getElementById('accountMenuSlot') as HTMLSlotElement;

    this.accountChip.addEventListener('click', this.handleChipClick);
    this.accountMenu.addEventListener('click', this.closeAccountMenu);
    this.accountMenuSlot.addEventListener('slotchange', this.updateAccountMenuAffordance);
    this.addEventListener('account-menu-changed', this.updateAccountMenuAffordance);
    document.addEventListener('click', this.closeAccountMenu);

    this.updateVisibility();
    this.updateAccountMenuAffordance();
    window.addEventListener('hashchange', this.updateVisibility);
  }

  disconnectedCallback(): void {
    this.accountChip?.removeEventListener('click', this.handleChipClick);
    this.accountMenu?.removeEventListener('click', this.closeAccountMenu);
    this.accountMenuSlot?.removeEventListener('slotchange', this.updateAccountMenuAffordance);
    this.removeEventListener('account-menu-changed', this.updateAccountMenuAffordance);
    document.removeEventListener('click', this.closeAccountMenu);
    window.removeEventListener('hashchange', this.updateVisibility);
  }

  private updateVisibility = (): void => {
    const authed = isAuthenticated();
    const isAdmin = authed && hasRole('Admin');
    const isTeacherOrAdmin = authed && hasAnyRole(['Teacher', 'Admin']);
    const isCoordinatorOrAdmin = authed && hasAnyRole(['Coordinator', 'Admin']);
    const basePath = window.location.hash.slice(1).split('?')[0];
    const activeSection = updateActiveNavSection(basePath);

    this.sections!.hidden = !authed;
    // A Coordinator who is not also a Teacher can reach the Students section,
    // but only its relationship-maintenance screen — so the entry point points
    // straight there rather than at the roster they cannot open.
    this.studentsLink!.hidden = !isTeacherOrAdmin && !isCoordinatorOrAdmin;
    this.studentsLink!.href = isTeacherOrAdmin ? '#/students' : '#/students/guardian-relationships';
    this.adminLink!.hidden = !isAdmin;

    this.dashboardLink!.classList.toggle('nav-bar__section-link--active', activeSection === 'dashboard');
    this.studentsLink!.classList.toggle('nav-bar__section-link--active', activeSection === 'students');
    this.adminLink!.classList.toggle('nav-bar__section-link--active', activeSection === 'admin');

    this.accountChip!.hidden = !authed;
    this.accountEmail!.textContent = authed ? getEmail() : '';
    if (!authed) this.closeAccountMenu();
  };

  /**
   * The chip only behaves as a menu trigger when something has actually been
   * slotted into the menu. Nothing here knows or cares what those items are —
   * the account menu is an anchor the shell composes into, which is what keeps
   * a feature's screens out of the shared nav bar.
   */
  private updateAccountMenuAffordance = (): void => {
    // A slotted item decides for itself whether it has anything to offer this
    // user and hides when it does not, announcing the change with
    // `account-menu-changed`. An empty menu must leave the chip looking inert,
    // so a hidden item counts for nothing here.
    const hasItems = this.hasAccountMenuItems();
    this.accountChevron!.hidden = !hasItems;
    this.accountChip!.classList.toggle('nav-bar__account--interactive', hasItems);
    if (!hasItems) this.closeAccountMenu();
  };

  private hasAccountMenuItems(): boolean {
    return this.accountMenuSlot!.assignedElements().some((element) => !element.hasAttribute('hidden'));
  }

  private handleChipClick = (event: Event): void => {
    // Without this the click reaches the document listener below and closes the
    // menu in the same gesture that opened it.
    event.stopPropagation();
    if (!this.hasAccountMenuItems()) return;

    this.setAccountMenuOpen(this.accountMenu!.hidden);
  };

  private closeAccountMenu = (): void => {
    this.setAccountMenuOpen(false);
  };

  private setAccountMenuOpen(open: boolean): void {
    this.accountMenu!.hidden = !open;
    this.accountChip!.setAttribute('aria-expanded', String(open));
  }
}

customElements.define('pm-nav-bar', PmNavBar);
