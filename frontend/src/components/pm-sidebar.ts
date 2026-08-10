import { NAV_ENTRIES, isNavEntryActive, isNavEntryPermitted, type NavEntry } from '../services/nav-entries';

function dividerId(entry: NavEntry): string {
  return `${entry.id}Divider`;
}

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      width: var(--pm-sidebar-width, 240px);
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
    .sidebar__divider {
      margin: 8px 12px;
      border: 0;
      border-top: 1px solid var(--pm-border);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <nav>
    <div class="sidebar__links">
      ${NAV_ENTRIES.map(
        (entry) => `${entry.startsGroup ? `\n      <hr class="sidebar__divider" id="${dividerId(entry)}" hidden>` : ''}
      <a href="#${entry.path}" class="sidebar__link" id="${entry.id}" hidden>
        <span class="sidebar__icon">${entry.icon}</span>
        <span>${entry.label}</span>
      </a>`,
      ).join('')}
    </div>
  </nav>
`;

export class PmSidebar extends HTMLElement {
  private links = new Map<string, HTMLAnchorElement>();
  private dividers = new Map<string, HTMLElement>();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    for (const entry of NAV_ENTRIES) {
      this.links.set(entry.id, this.shadowRoot!.getElementById(entry.id) as HTMLAnchorElement);
      if (entry.startsGroup) {
        this.dividers.set(entry.id, this.shadowRoot!.getElementById(dividerId(entry)) as HTMLElement);
      }
    }

    this.updateVisibility();
    window.addEventListener('hashchange', this.updateVisibility);
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.updateVisibility);
  }

  private updateVisibility = (): void => {
    const basePath = window.location.hash.slice(1).split('?')[0];

    for (const entry of NAV_ENTRIES) {
      const link = this.links.get(entry.id)!;
      link.hidden = !isNavEntryPermitted(entry);
      link.classList.toggle('sidebar__link--active', isNavEntryActive(entry, basePath));
    }

    // A rule only earns its place with something offered on both sides of it,
    // so a user who sees only one group is shown no divider at all.
    for (const [id, divider] of this.dividers) {
      const index = NAV_ENTRIES.findIndex((entry) => entry.id === id);
      const above = NAV_ENTRIES.slice(0, index).some(isNavEntryPermitted);
      const below = NAV_ENTRIES.slice(index).some(isNavEntryPermitted);
      divider.hidden = !above || !below;
    }
  };
}

customElements.define('pm-sidebar', PmSidebar);
